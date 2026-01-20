from fastapi import HTTPException, APIRouter, Request
from sqlalchemy import text, CursorResult

from app.models import Station

router = APIRouter(
    prefix="/stations",
    tags=["stations"],
    responses={404: {"description": "Not found"}},
)


@router.get("/")
async def get_stations(request: Request) -> dict:
    """
    Endpoint that calls the synchronous DB function. FastAPI automatically handles 
    thread pooling for the blocking operation.
    """
    try:
        # FastAPI executes the synchronous fetch_station_labels_from_db in a thread pool.
            engine = getattr(request.app.state, "db_engine", None)
            if engine is None:
                raise ConnectionError("SQLAlchemy Engine is unavailable.")
            query = """
                SELECT DISTINCT ON (s.station_id)
                    s.label,
                    s.station_id,
                    r.date_time AS latest_reading,
                    r.value,
                    s.lat,
                    s.long
                FROM stations s
                JOIN readings r ON s.station_id = r.station_id
                ORDER BY
                    s.station_id,
                    r.date_time DESC,
                    s.label ASC;

            """            
            with engine.connect() as conn:
                stations = {}
                result: CursorResult = conn.execute(text(query))
                for row in result:
                    stations[row[0]] = Station(label=row[0], station_id=row[1], date_time=row[2], latest_reading=row[3], lat=row[4], lon=row[5])
                    
                # stations = [Station(label=row[0], station_id=row[1], date_time=row[2]) for row in result]
                
            return stations
        
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching stations: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")