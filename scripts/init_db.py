import os

import psycopg
from dotenv import load_dotenv

from pathlib import Path
from .csv_loader import csv_loader

# Load environment variables from .env file
load_dotenv()

# Get the connection string from the environment variable
conn_string = os.getenv("DATABASE_URL")
fields, stations = csv_loader(Path("data/stations.csv"))
# print(stations)

try:
    with psycopg.connect(conn_string) as conn:
        print("Connection established")

        # Open a cursor to perform database operations
        with conn.cursor() as cur:
            # Drop the table if it already exists
            cur.execute("DROP TABLE IF EXISTS stations;")
            print("Finished dropping table (if it existed).")

            # Create a new table
            cur.execute("""
                CREATE TABLE stations (
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
                    
            print("Finished creating table.")
            
            
            # Load locally pre-cached station data
            fields, stations = csv_loader(Path("data/stations.csv"))

            # Insert multiple books at once
            cur.executemany(
                "INSERT INTO stations (notation, label, lat, long, qualifier, unitName) VALUES (%s, %s, %s, %s, %s, %s);",
                stations,
            )

            print(f"Inserted {len(stations)} rows of data.")
            # The transaction is committed automatically when the 'with' block exits in psycopg (v3)

except Exception as e:
    print("Connection failed.")
    print(e)