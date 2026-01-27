# Required for redis
import json
import os
import re
import pendulum
import utide
import pandas as pd
from numpy import ndarray
from pathlib import Path
from typing import List, Optional, Sequence, Dict, Any, Union, cast

from fastapi import Depends, HTTPException, APIRouter, Request
from pydantic import ValidationError
from sqlalchemy import text, CursorResult
from sqlalchemy.engine import RowMapping
import aiofiles
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection
from dotenv import load_dotenv

from app.internal.utilities import json_to_utide_coef
from app.dependencies.redis import get_redis
from app.models import Reading, StationDataResponse, StationTableResponse

load_dotenv()
CACHE_TIME_LIMIT:int = int(os.getenv("CACHE_TIME_LIMIT", 3600))

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

async def fetch_readings_for_station(station_label:str, request: Request, start_date: Optional[str]=None, end_date: Optional[str]=None) -> tuple[List[Reading], pendulum.DateTime, pendulum.DateTime]:
    
    print(f"[DEBUG] /data/{station_label}: Making a new request for {start_date} to {end_date}")
    
    today: pendulum.DateTime = pendulum.now().in_timezone("UTC")
    start: pendulum.DateTime = cast(pendulum.DateTime, pendulum.parse(start_date)).in_timezone("UTC") if start_date else today.subtract(weeks=2)
    
    if end_date in ("today", None):
        end: pendulum.DateTime = today
    else:
        end: pendulum.DateTime = pendulum.parse(end_date).in_timezone("UTC") # type: ignore
        # Cap end date to today if it's in the future
        if end > today:
            end = today

    max_range: pendulum.DateTime = end.subtract(months=6)
    if start < max_range:
        start = max_range
        
    try:
        # Retrieve the db_engine stored in the state of the app associated with this request
        engine: Optional[AsyncEngine] = getattr(request.app.state, "db_engine", None)
        if engine is None:
            raise HTTPException(status_code=503, detail="Database engine unavailable")
        
        query: str = """
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
        async with engine.connect() as conn:
            conn: AsyncConnection
            
            result: CursorResult = await conn.execute(
                text(query),
                {
                    "station_label": station_label,
                    "start_date": start.to_iso8601_string(),
                    "end_date": end.to_iso8601_string(),
                },
            )
            rows: Sequence[RowMapping] = result.mappings().all()
                
            readings: List[Reading] = [
                Reading(
                    date_time=row["date_time"],
                    value=row["value"],
                    station_id=row["station_id"],
                    station_label=row["station_label"],
                )
                for row in rows
            ]
        return readings, start, end
            
    except Exception as e:
        print(f"Error fetching stations: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")

async def load_ttable(station_label:str) -> Dict[str, float]:
    label: str = station_label.replace(" ", "-")
    tables = list(Path("./app/tide-data/tide-tables/").rglob(f"ttable_*_{label}*"))
    if len(tables) > 1:
        return {'MHWS': 0, 'MHWN': 0, 'MLWS': 0, 'MLWN': 0, 'srange': 0, 'nrange': 0}
    
    async with aiofiles.open(tables[0], 'r') as f:
        contents = await f.read()
        
    return json.loads(contents)

async def create_astronomical_tide(station_label: str, datetimes: List[pendulum.DateTime]) -> List[float] | None:
    '''
    Creates the astronomical tide prediction for the chosen station at specific datetimes.
    Args:
        station_label: Station name
        datetimes: List of pendulum DateTime objects for which to generate the astronomical tide
    Returns:
        List of tidal elevation values matching the input datetimes
    '''
    if not datetimes:
        return None
        
    label: str = station_label.replace(" ", "-")
    coefs: List[Path] = list(Path("./app/tide-data/coef/").rglob(f"coef_*_{label}*"))
    
    if len(coefs) != 1:
        return None
    
    try:
        async with aiofiles.open(coefs[0], 'r') as f:
            contents: str = await f.read()
        
        coef: Any = json_to_utide_coef(json.loads(contents))
        # Convert pendulum DateTimes to pandas DatetimeIndex (timezone-naive UTC)
        t: pd.DatetimeIndex = pd.DatetimeIndex([dt.naive() for dt in datetimes])
        h: ndarray = utide.reconstruct(t, coef, verbose=False).h
        
        return h.tolist()
    except Exception as e:
        print(f"[ERROR] Astronomical tide generation failed: {e}")
        return None


@router.get("/{station_label}", response_model=StationDataResponse)
async def get_readings_data(
    station_label: str,
    request: Request,
    start_date: Optional[str]=None,
    end_date: Optional[str]=None,
    redis=Depends(get_redis)
) -> Union[StationDataResponse, Dict[str, Any]]:
    """
    Endpoint that retrieves water level measurements from the db, generates the astronomical tide prediction and also return the tide tables.
    """
    print("----------------------------")
    print(station_label)
    print(start_date, " ", end_date)
    print("----------------------------")
       
    # --- Redis Caching ---
    # Parse requested range
    requested_start: Optional[pendulum.DateTime] = None
    requested_end: Optional[pendulum.DateTime] = None
    
    if start_date and end_date :
        requested_start = cast(pendulum.DateTime, pendulum.parse(start_date))
        requested_end = cast(pendulum.DateTime, pendulum.parse(end_date))

        if requested_start >= requested_end:
            raise HTTPException(status_code=404, detail=f"End date must be greater than the Start date.")
    
    cache_key: str = f"readings:{station_label}:{start_date}:{end_date}"
    cached_data: Optional[bytes] = await redis.get(cache_key)
    
    # If we have the exact key then brilliant => return it
    if cached_data:
        print("[DEBUG] Served from REDIS")
        cached_json = json.loads(cached_data)
        # Ensure actual_start_date and actual_end_date are present
        if "actual_start_date" not in cached_json or "actual_end_date" not in cached_json:
            # Fallback: use first/last date_time if available
            date_times = cached_json.get("date_time", [])
            cached_json["actual_start_date"] = date_times[0] if date_times else None
            cached_json["actual_end_date"] = date_times[-1] if date_times else None
        # Always return as StationDataResponse for validation
        return StationDataResponse(**cached_json)

    # If we don't have the key check if it belongs to a superset
    superset_key: Optional[str] = None
    # Retrieve all redis keys for the station
    keys: List[str] = await redis.keys(f"readings:{station_label}:*")
    # Example: readings:Lowestoft:2025-04-30T23:04:00.000Z:2025-05-03T23:04:00.000Z
    cache_key_regex: re.Pattern[str] = re.compile(rf"^readings:{re.escape(station_label)}:(.+?[A-Z]):(.+[A-Z])$")
    
    for key in keys:
        match: Optional[re.Match[str]]= cache_key_regex.match(key)
        
        if match:
            cached_start_str, cached_end_str = match.groups()
            try:
                cached_start: pendulum.DateTime = cast(pendulum.DateTime, pendulum.parse(cached_start_str))
                cached_end: pendulum.DateTime = cast(pendulum.DateTime, pendulum.parse(cached_end_str))
                
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
                
    # If superset found, load and filter them
    if superset_key:
        print(f"Superset cache found: {superset_key}")
        superset_data = await redis.get(superset_key)
        superset_json: Dict[str, Any] = json.loads(superset_data)

        # Filter date_time and values arrays to requested range
        filtered_date_times: List[str] = []
        filtered_values: List[float] = []
        filtered_astro: List[float] = []

        for dt_str, value, astro_val in zip(superset_json["date_time"], superset_json["values"], superset_json["astro"]):
            dt: pendulum.DateTime = cast(pendulum.DateTime, pendulum.parse(dt_str))
            if requested_start <= dt <= requested_end: # type: ignore
                filtered_date_times.append(dt_str)
                filtered_values.append(float(value))
                filtered_astro.append(astro_val)

        # Calculate surge residual
        filtered_surge: List[float] = [val - astro for val, astro in zip(filtered_values, filtered_astro)]
        
        # Build filtered response
        # Fallback for empty filtered_date_times and None requested_start/end
        if filtered_date_times:
            actual_start_date = filtered_date_times[0]
            actual_end_date = filtered_date_times[-1]
        else:
            actual_start_date = requested_start.to_iso8601_string() if requested_start else None
            actual_end_date = requested_end.to_iso8601_string() if requested_end else None
        filtered_response: Dict[str, Any] = {
            "station_id": superset_json["station_id"],
            "station_label": superset_json["station_label"],
            "date_time": filtered_date_times,
            "values": filtered_values,
            "astro": filtered_astro,
            "surge": filtered_surge,
            "actual_start_date": actual_start_date,
            "actual_end_date": actual_end_date,
            "unit": superset_json.get("unit", "mAOD")
        }

        print("[DEBUG] Served filtered superset from REDIS")
        return StationDataResponse(**filtered_response)

    
    try:
        readings, actual_start, actual_end = await fetch_readings_for_station(station_label, request, start_date=start_date, end_date=end_date)

        if not readings:
            raise HTTPException(status_code=404, detail=f"Station '{station_label}' not found or has no data.")

        # Generate astronomical tide for the exact timestamps of the readings
        reading_datetimes: List[pendulum.DateTime] = [r.date_time for r in readings]
        astronomical: List[float] | None = await create_astronomical_tide(station_label, reading_datetimes)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching data for {station_label}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")

    # Data Transformation
    # The datetime objects from the DB are converted to ISO strings by Pydantic's serialization
    date_times: List[str] = [r.date_time.to_iso8601_string() for r in readings]
    values: List[float] = [r.value for r in readings]
    station_id: List[int] = [r.station_id for r in readings]

    if not astronomical:
        astronomical = [0.0] * len(readings)
    
    # Calculate surge residual (Water Level - Predicted Tide)
    surge: List[float] = [val - astro for val, astro in zip(values, astronomical)]

    # Convert actual_start and actual_end to ISO strings
    actual_start_str: str = actual_start.to_iso8601_string()
    actual_end_str: str = actual_end.to_iso8601_string()

    # Pydantic serialization and validation
    try:
        response = StationDataResponse(
            station_id=station_id[0],
            station_label=station_label,
            date_time=date_times,
            values=values,
            astro=astronomical,
            surge=surge,
            actual_start_date=actual_start_str,
            actual_end_date=actual_end_str,
            unit="mAOD"
        )
    except ValidationError as err:
        raise HTTPException(status_code=500, detail=f"Validation error. {repr(err.errors()[0]['type'])} {repr(err.errors()[0]['loc'])}")

    # Cache the response in Redis (as JSON)    
    await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TIME_LIMIT)  # Cache for 1 hour

    return response


@router.get("/{station_label}/table", response_model=StationTableResponse)
async def get_tide_tables(station_label: str, redis=Depends(get_redis)):
    cache_key: str = f"ttable:{station_label}"
    cached_data: Optional[bytes] = await redis.get(cache_key)
    
    if cached_data:
        print(f"[DEBUG] Tide table for {station_label} served from REDIS")
        return json.loads(cached_data)
    
    try:
        ttable: Dict[str, float] = await load_ttable(station_label)
        response = StationTableResponse(
            station_label=station_label,
            tidal_info=ttable
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")
    
    # Cache the response in Redis (tide tables don't change, so longer cache)
    await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TIME_LIMIT * 24)  # Cache for 24 hours
    
    return response