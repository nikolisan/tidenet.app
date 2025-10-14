import os

import psycopg
from dotenv import load_dotenv

from pathlib import Path
from .csv_loader import csv_loader

# Load environment variables from .env file
load_dotenv()

# Get the connection string from the environment variable
conn_string = os.getenv("DATABASE_URL")

try:
    with psycopg.connect(conn_string) as conn:
        print("Connection established")

        # Open a cursor to perform database operations
        with conn.cursor() as cur:
            
            # Create a new table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS  stations (
                    station_id SERIAL PRIMARY KEY,
                    notation VARCHAR(50) UNIQUE NOT NULL,
                    label VARCHAR(255) NOT NULL,
                    lat DOUBLE PRECISION NOT NULL,
                    long DOUBLE PRECISION NOT NULL,
                    qualifier VARCHAR(100),
                    unitName VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
                    
            print("Finished creating table `stations`.")
            
            
            # Load locally pre-cached station data
            fields, stations = csv_loader(Path("data/stations.csv"))
            cur.executemany(
                "INSERT INTO stations (notation, label, lat, long, qualifier, unitName) VALUES (%s, %s, %s, %s, %s, %s);",
                stations,
            )

            print(f"Inserted {len(stations)} rows of data to stations.")
            
            # initialise readings table
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS readings (
                    reading_id BIGSERIAL PRIMARY KEY,
                    station_id INTEGER NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
                    value DOUBLE PRECISION NOT NULL,
                    date_time TIMESTAMP NOT NULL,
                    unit_name VARCHAR(100),
                    UNIQUE (station_id, date_time)
                );
            """)
            print("Finished creating table `readings`.")
            

except Exception as e:
    print("Connection failed.")
    print(e)