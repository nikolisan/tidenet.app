# Required for redis
from fastapi import Depends
from app.dependencies.redis import get_redis
import json

from dotenv import load_dotenv
import os

load_dotenv()
CACHE_TIME_LIMIT = int(os.getenv("CACHE_TIME_LIMIT", 3600))

from fastapi import HTTPException, APIRouter, Request
from pydantic import ValidationError
from sqlalchemy import text, CursorResult
from sqlalchemy.engine import RowMapping
from typing import List, Optional, Sequence
import pendulum
import re

from app.models import Reading, StationDataResponse

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

def fetch_readings_for_station(station_label:str, request: Request, start_date: Optional[str]=None, end_date: Optional[str]=None) -> List[Reading]:
    
    print(f"[DEBUG] /data/{station_label}: Making a new request for {start_date} to {end_date}")
    
    today = pendulum.now().in_timezone("UTC")
    start: pendulum.DateTime = pendulum.parse(start_date).in_timezone("UTC") if start_date else today.subtract(weeks=2) # type: ignore
    
    if end_date == "today" or end_date == None:
        end: pendulum.DateTime = today
    else:
        end: pendulum.DateTime = pendulum.parse(end_date).in_timezone("UTC") # type: ignore

    max_range = end.subtract(months=6)
    if start < max_range:
        start = max_range
        
    try:
    # FastAPI executes the synchronous fetch_station_labels_from_db in a thread pool.
        engine = getattr(request.app.state, "db_engine", None)
        if engine is None:
            raise ConnectionError("SQLAlchemy Engine is unavailable.")
        query = """
            SELECT 
                r.date_time AT TIME ZONE 'UTC' AS date_time, 
                r.value, 
                r.station_id, 
                s.label AS station_label
            FROM readings r
            JOIN stations s ON r.station_id = s.station_id
            WHERE s.label = :station_label
                AND r.date_time BETWEEN :start_date AND :end_date
            ORDER BY r.date_time ASC;
        """       
        with engine.connect() as conn:
            result: CursorResult = conn.execute(
                text(query),
                {
                    "station_label": station_label,
                    "start_date": start.to_iso8601_string(),
                    "end_date": end.to_iso8601_string(),
                },
            )
            rows: Sequence[RowMapping] = result.mappings().all()
                
            readings = [
                Reading(
                    date_time=row["date_time"],
                    value=row["value"],
                    station_id=row["station_id"],
                    station_label=row["station_label"],
                )
                for row in rows
            ]
                
        return readings
            
        
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching stations", e)
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")




@router.get("/{station_label}", response_model=StationDataResponse)
async def get_readings_data(
    station_label: str,
    request: Request,
    start_date: Optional[str]=None,
    end_date: Optional[str]=None,
    redis=Depends(get_redis)
):
    """
    Endpoint that calls the synchronous DB function to get time-series data.
    """
    print("----------------------------")
    print(station_label)
    print(start_date, " ", end_date)
    print("----------------------------")
    
    # --- Redis Caching ---
    # Parse requested range
    requested_start = None # type: ignore
    requested_end = None # type: ignore
    if start_date:
        requested_start: pendulum.DateTime = pendulum.parse(start_date) # type: ignore
    if end_date:
        requested_end: pendulum.DateTime = pendulum.parse(end_date) # type: ignore

    if requested_start >= requested_end:
        raise HTTPException(status_code=404, detail=f"End date must be greater than the Start date.")
    
    cache_key: str = f"readings:{station_label}:{start_date}:{end_date}"
    cached_data = await redis.get(cache_key)
    
    # If we have the exact key then brilliant => return it
    if cached_data:
        print("[DEBUG] Served from REDIS")
        return json.loads(cached_data)

    # If we don't have the key check if it belongs to a superset
    superset_key = None
    # Retrieve all redis keys for the station
    keys = await redis.keys(f"readings:{station_label}:*")
    # Example: readings:Lowestoft:2025-04-30T23:04:00.000Z:2025-05-03T23:04:00.000Z
    cache_key_regex: re.Pattern[str] = re.compile(rf"^readings:{re.escape(station_label)}:(.+?[A-Z]):(.+[A-Z])$")
    for key in keys:
        match = cache_key_regex.match(key)
        if match:
            cached_start_str, cached_end_str = match.groups()
            try:
                cached_start = pendulum.parse(cached_start_str)
                cached_end = pendulum.parse(cached_end_str)
            except Exception as e:
                print(f"[ERROR] Key: {key}")
                print(f"[ERROR] Extracted: start={cached_start_str}, end={cached_end_str}")
                print(f"[ERROR] Failed to parse dates for key {key}: {e}")
                continue
            # Check if cached range fully covers requested range
            if requested_start and requested_end:
                if cached_start <= requested_start and cached_end >= requested_end: # type: ignore
                    superset_key = key
                    break
    # If superset found, load and filter in next step
    if superset_key:
        print(f"Superset cache found: {superset_key}")
        superset_data = await redis.get(superset_key)
        superset_json = json.loads(superset_data)
        # Filter date_time and values arrays to requested range
        filtered_date_times = []
        filtered_values = []
        for dt_str, value in zip(superset_json["date_time"], superset_json["values"]):
            dt = pendulum.parse(dt_str)
            if requested_start <= dt <= requested_end: # type: ignore
                filtered_date_times.append(dt_str)
                filtered_values.append(value)
        # Build filtered response
        filtered_response = {
            "station_id": superset_json["station_id"],
            "station_label": superset_json["station_label"],
            "date_time": filtered_date_times,
            "values": filtered_values,
            "unit": superset_json.get("unit", "mAOD")
        }
        print("[DEBUG] Served filtered superset from REDIS")
        return filtered_response

    
    try:
        # FastAPI executes the synchronous fetch_readings_for_station in a thread pool.
        readings = fetch_readings_for_station(station_label, request, start_date=start_date, end_date=end_date)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching data for {station_label}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")
    
    if not readings:
        raise HTTPException(status_code=404, detail=f"Station '{station_label}' not found or has no data.")

    # Data Transformation
    # The datetime objects from the DB are converted to ISO strings by Pydantic's serialization
    date_times: List[str] = [r.date_time.to_iso8601_string() for r in readings]
    values: List[float] = [r.value for r in readings]
    station_id: List[int] = [r.station_id for r in readings]
    
    # more than 1 station return => throw error
    if not len(set(station_id)) == 1:
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")

    # Pydantic serialization and validation
    try:
        response = StationDataResponse(
            station_id=station_id[0],
            station_label=station_label,
            date_time=date_times,
            values=values,
            unit="mAOD"
        )
    except ValidationError as err:
        raise HTTPException(status_code=500, detail=f"Validation error. {repr(err.errors()[0]['type'])} {repr(err.errors()[0]['loc'])}")

    # Cache the response in Redis (as JSON)    
    await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TIME_LIMIT)  # Cache for 1 hour

    return response