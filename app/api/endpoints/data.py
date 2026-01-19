from fastapi import HTTPException, APIRouter, Request
from pydantic import ValidationError
from sqlalchemy import text, CursorResult
from sqlalchemy.engine import RowMapping
from typing import List, Optional, Sequence
import pendulum

from app.models import Reading, StationDataResponse

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

@router.get("/fetch")
def fetch_readings_for_station(station_label:str, request: Request, start_date: Optional[str]=None, end_date: Optional[str]=None) -> List[Reading]:
    today = pendulum.now().in_timezone("UTC")
    start: pendulum.DateTime = pendulum.parse(start_date).in_timezone("UTC") if start_date else today.subtract(weeks=2) # type: ignore
    
    if end_date == "today" or end_date == None:
        end: pendulum.DateTime = today
    else:
        end: pendulum.DateTime = pendulum.parse(end_date).in_timezone("UTC") # type: ignore

    max_range = end.subtract(months=6)
    if start < max_range:
        start = max_range
        
    print(f"{start=}   {end=}  duration:{(end - start).days} days")
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
async def get_readings_data(station_label: str, request: Request, start_date: Optional[str]=None, end_date: Optional[str]=None):
    """
    Endpoint that calls the synchronous DB function to get time-series data.
    """
    
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

    return response