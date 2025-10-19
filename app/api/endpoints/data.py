from fastapi import HTTPException, APIRouter, Request
from pydantic import ValidationError
from sqlalchemy import text, CursorResult
from typing import List

from app.models import Reading, StationDataResponse

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

# @router.get("/{station_label}", response_model=List[str])
# async def get_stations(station_label:str, request: Request):

@router.get("/fetch/{station_label}")
def fetch_readings_for_station(station_label:str, request: Request) -> List[Reading]:

    try:
    # FastAPI executes the synchronous fetch_station_labels_from_db in a thread pool.
        engine = getattr(request.app.state, "db_engine", None)
        if engine is None:
            raise ConnectionError("SQLAlchemy Engine is unavailable.")
        query = """
            SELECT r.date_time, r.value, r.station_id, s.label
            FROM readings r
            JOIN stations s ON r.station_id = s.station_id
            WHERE s.label = :station_label 
            ORDER BY r.date_time ASC;
        """       
        with engine.connect() as conn:
            result: CursorResult = conn.execute(text(query), {"station_label": station_label})
            readings = [Reading(date_time=row[0], value=row[1],station_id=row[2],station_label=row[3]) for row in result]
                
        return readings
            
        
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching stations")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")




@router.get("/{station_label}", response_model=StationDataResponse)
async def get_readings_data(station_label: str, request: Request):
    """
    Endpoint that calls the synchronous DB function to get time-series data.
    """
    
    try:
        # FastAPI executes the synchronous fetch_readings_for_station in a thread pool.
        readings = fetch_readings_for_station(station_label, request)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching data for {station_label}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")
    
    if not readings:
        raise HTTPException(status_code=404, detail=f"Station '{station_label}' not found or has no data.")

    # Data Transformation
    # The datetime objects from the DB are converted to ISO strings by Pydantic's serialization
    date_times: List[str] = [r.date_time.isoformat() for r in readings]
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