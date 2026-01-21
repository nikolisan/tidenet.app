import os
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy import create_engine, text

from scripts.csv_loader import csv_to_pd
from scripts.utilities import coloured_fn_name

load_dotenv()

# Get the connection string from the environment variable
CONN_STRING = os.getenv("DATABASE_URL_SQLALCHEMY")

# Create a SQLAlchemy engine
engine = create_engine(CONN_STRING, pool_pre_ping=True)

def init_database():
    """Initialize database tables and load station data."""
    try:
        with engine.begin() as conn:
            print(f"{coloured_fn_name("CYAN")} Connection established")

            # --- Create `stations` table ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS stations (
                    station_id SERIAL PRIMARY KEY,
                    notation VARCHAR(50) UNIQUE NOT NULL,
                    label VARCHAR(255) NOT NULL,
                    lat DOUBLE PRECISION NOT NULL,
                    long DOUBLE PRECISION NOT NULL,
                    qualifier VARCHAR(100),
                    unitName VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """))
            print(f"{coloured_fn_name("CYAN")} Created or verified table `stations`.")

            # --- Load pre-cached station data ---
            stations_df = csv_to_pd(Path("data/stations.csv"), delimiter=None, has_header=True)
            # pd.to_sql does not support ON CONFLICT -> use reqular SQL
            # conn.execute(text("""
            #     INSERT INTO stations (notation, label, lat, long, qualifier, unitName)
            #     VALUES (:notation, :label, :lat, :long, :qualifier, :unitName)
            #     ON CONFLICT (notation) DO NOTHING;
            # """), stations_df.to_dict(orient="records"))
            

            print(f"{coloured_fn_name("CYAN")} Inserted {len(stations_df)} station records into `stations`.")

            # --- Create `readings` table ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS readings (
                    reading_id BIGSERIAL PRIMARY KEY,
                    station_id INTEGER NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
                    value DOUBLE PRECISION NOT NULL,
                    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
                    unit_name VARCHAR(100),
                    UNIQUE (station_id, date_time)
                );
            """))

            print(f"{coloured_fn_name("CYAN")} Created or verified table `readings`.")

            # --- Create index on (station_id, date_time) ---
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_readings_station_time
                ON readings (station_id, date_time);
            """))
            print(f"{coloured_fn_name('CYAN')} Created or verified index idx_readings_station_time on `readings`.")

    except Exception as e:
        print(f"{coloured_fn_name("CYAN")} Database initialization failed:")
        print(e)


if __name__ == "__main__":
    init_database()
