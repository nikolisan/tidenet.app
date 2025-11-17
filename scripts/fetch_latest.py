import os
import requests
import pendulum

from typing import List

from sqlalchemy import create_engine, text, CursorResult
from sqlalchemy.engine import Engine
from  datetime import datetime
from requests.exceptions import HTTPError
from dotenv import load_dotenv

# from scripts.csv_loader import url_to_pd, process_historical_csv, async_csv_to_pd
from scripts.utilities import coloured_fn_name
from app.models import Reading, Station, StationDataResponse

load_dotenv()

_RETRIES = 5


def create_db_engine() -> Engine:
    """Create a new SQLAlchemy Engine."""
    conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "")
    echo = os.getenv("DEBUG_ECHO", "False").lower() in ('true', '1')
    if not conn_string:
        raise ValueError("DATABASE_URL_SQLALCHEMY is not set in the environment.")
    
    engine = create_engine(
        conn_string,
        echo=echo,
        pool_pre_ping=True
    )

    # Optional connection test
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    
    return engine


# TODO: add the thresholds and discard the values that are outside the limits
def fetch_latest_15min_reading(engine) -> None:
    api_url: str = os.getenv("API_ROOT", "") + os.getenv("MEASURES_URI", "")
    fn_name = coloured_fn_name("CYAN")
    
    if engine is None:
        raise ConnectionError(f"{fn_name}: SQLAlchemy Engine is unavailable.")
    
    with engine.begin() as conn:
        print(f"{fn_name} Connection established")
        
        # Get stations as dict {notation: id}
        stations: dict[str, str] = {}
        result: List = conn.execute(text("SELECT notation, station_id FROM stations")).mappings().all()
        for row in result:
            stations[row["notation"]] = row["station_id"]
        print(f"{fn_name} Loaded {len(stations)} stations from database.")
        
        # Fetch latest readings for all stations
        print(f"{fn_name} Fetching latest readings")
        for n in range(_RETRIES):
            try:
                response: requests.Response = requests.get(api_url)
                response.raise_for_status()
                
            except HTTPError as exc:
                print(f"Attempt {n+1}: HTTP error {exc.response.status_code}")
                if n == _RETRIES - 1:
                    raise
            
            except Exception as e:
                print(f"Attempt {n+1}: {e}")
                if n == _RETRIES - 1:
                    raise
            
            items: List = response.json()["items"]

        print(f"{fn_name} Downloaded {len(items)} latest 15min readings.")
        rows_to_insert = []
        for item in items:
            station_notation = item["station"].split("/")[-1]
            # TODO: Remove lines 83-84 to include all stations
            if not station_notation == "E70039":
                continue
            station_id = stations.get(station_notation)
            if not station_id:
                print(f"Station {station_notation} not found in DB, skipping.")
                continue

            unit_name = item.get("unitName")
            reading = item.get("latestReading")
            if not reading:
                print(f"{fn_name} Invalid reading for station {station_notation}, skipping.")
                continue
            
            value = reading.get("value")
            date_time = pendulum.parse(reading["dateTime"])

            rows_to_insert.append({
                "station_id": station_id,
                "value": value,
                "date_time": date_time,
                "unit_name": unit_name
            })
        # Save readings to table
        conn.execute(text("""
            INSERT INTO readings (station_id, value, date_time, unit_name)
            VALUES (:station_id, :value, :date_time, :unit_name)
            ON CONFLICT (station_id, date_time) DO NOTHING;
        """), rows_to_insert)
            
    print(f"{fn_name} Saved {len(rows_to_insert)} readings to `readings` table.")
        

def fetch_latest_missing(engine):
    if engine is None:
        raise ConnectionError("SQLAlchemy Engine is unavailable.")
    query = '''
        SELECT DISTINCT ON (r.station_id)
            r.station_id,
            s.notation,
            r.date_time
        FROM readings as r
        RIGHT JOIN stations AS s ON s.station_id = r.station_id
        ORDER BY r.station_id, r.date_time DESC
    '''
    
    with engine.connect() as conn:
        latest_stored_readings = {}
        result: List = conn.execute(text(query)).mappings().all()
        return result
        for row in result:
            latest_stored_readings[row["notation"]] = pendulum.instance(row["date_time"]).in_tz("UTC")
    
    return latest_stored_readings
    

if __name__ == '__main__':
    now = pendulum.now(tz='UTC')

    engine: Engine = create_db_engine()
    
    result = fetch_latest_missing(engine)
    
    engine.dispose()


    # there is an issue with station notation "XXXXX-anglian"
    # the latest script to load from pickle does not load those stations

    for row in result:
        print(row["notation"], row["date_time"])
        # latest_stored_readings[row["notation"]] = pendulum.instance(row["date_time"]).in_tz("UTC")
    