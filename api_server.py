import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
from sqlalchemy import create_engine, text, Engine
from dotenv import load_dotenv
from pydantic import ValidationError
from contextlib import asynccontextmanager

from models import Reading, StationDataResponse

AsyncSessionLocal = None
async_engine: Optional[Engine] = None

load_dotenv()

CONN_STRING: str = os.getenv("DATABASE_URL_SQLALCHEMY", "")

# def fetch_station_labels_from_db_mine(CONN_STRING):
#     engine = create_engine(CONN_STRING, pool_pre_ping=True)
#     with engine.connect() as conn:
#         result = conn.execute(text("SELECT DISTINCT label FROM stations"))
#     for row in result:
#         print(row)
        
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles the asynchronous startup (connect) and shutdown (disconnect) of the 
    synchronous SQLAlchemy engine.
    """
    global async_engine
    print("Initializing SQLAlchemy Synchronous Engine...")
    
    try:
        # Create the synchronous engine with connection pooling
        async_engine = create_engine(
            CONN_STRING,
            echo=True,
            # pool_pre_ping is useful to check connections before use
            pool_pre_ping=True
        )
        # Test connection (optional, but good practice)
        with async_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        print("SQLAlchemy Synchronous Engine initialized successfully.")
        
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to initialize SQLAlchemy engine. Check DATABASE_URL and driver. Details: {e}")
        
    yield # Application is now ready to serve requests

    # Shutdown phase: close connections
    if async_engine:
        print("Disposing SQLAlchemy Engine...")
        async_engine.dispose()
        print("Engine disposed.")

app = FastAPI(title="Async FastAPI & SQLAlchemy Demo", lifespan=lifespan)

# CORS setup (allows frontend to access the API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_engine() -> Engine:
    """Helper to retrieve the initialized engine."""
    if async_engine is None:
        raise ConnectionError("SQLAlchemy Engine is unavailable.")
    return async_engine

def fetch_station_labels_from_db() -> List[str]:
    """
    Fetches all unique station labels by JOINING 'stations' and 'readings'.
    Only returns labels for stations that actually have associated readings.
    NOTE: FastAPI runs this 'def' function in a separate thread pool.
    """
    engine = get_db_engine()
    
    query = """
        SELECT DISTINCT s.label
        FROM stations s
        JOIN readings r ON s.station_id = r.station_id
        ORDER BY s.label ASC;
    """
    labels = []
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        labels = [row[0] for row in result]
    return labels

def fetch_readings_for_station(label: str) -> List[Reading]:
    """
    Fetches readings (value, date_time) for a specific station using a JOIN.
    We match the station's human-readable label to its readings via station_id.
    NOTE: FastAPI runs this 'def' function in a separate thread pool.
    """
    engine = get_db_engine()
    
    sql = """
        SELECT r.date_time, r.value, r.station_id, s.label
        FROM readings r
        JOIN stations s ON r.station_id = s.station_id
        WHERE s.label = :label 
        ORDER BY r.date_time ASC;
    """
    readings = []
    
    with engine.connect() as conn:
        # Use parameterized query execution for safety. :label binds to the 'label' variable.
        result = conn.execute(text(sql), {"label": label})
        
        # Manually map the result rows to Pydantic objects
        for row in result:
            # The row contains date_time and value (as positional elements)
            readings.append(
                Reading(
                    date_time=row[0], # Should be the TIMESTAMP WITH TIME ZONE
                    value=row[1],
                    station_id=row[2],
                    station_label=row[3]
                )
            )
            
    return readings

# -------------------------
# ENDPOINTS
# -------------------------

@app.get("/stations", response_model=List[str])
async def get_stations():
    """
    Endpoint that calls the synchronous DB function. FastAPI automatically handles 
    thread pooling for the blocking operation.
    """
    try:
        # FastAPI executes the synchronous fetch_station_labels_from_db in a thread pool.
        return fetch_station_labels_from_db()
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching stations: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")

@app.get("/data/{station_label}", response_model=StationDataResponse)
async def get_readings_data(station_label: str):
    """
    Endpoint that calls the synchronous DB function to get time-series data.
    """
    
    try:
        # FastAPI executes the synchronous fetch_readings_for_station in a thread pool.
        readings = fetch_readings_for_station(station_label)
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