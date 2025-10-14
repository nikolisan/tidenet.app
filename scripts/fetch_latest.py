import os
import psycopg
import requests
from  datetime import datetime
from requests.exceptions import HTTPError
from dotenv import load_dotenv

from pathlib import Path

load_dotenv()

# Get the connection string from the environment variable
conn_string = os.getenv("DATABASE_URL")
api_url = os.getenv("API_ROOT") + os.getenv("MEASURES_URI")
retries = 5
        


with psycopg.connect(conn_string) as conn:
    print("Connection established")

    with conn.cursor() as cur:

        # Get stations as dict {notation: id}
        cur.execute("SELECT notation, station_id FROM stations;")
        stations = {notation: station_id for notation, station_id in cur.fetchall()}
        print(f"Loaded {len(stations)} stations from database.")

        # Fetch latest readings for all stations
        print("Fetching latest readings")
        for n in range(retries):
            try:
                response = requests.get(api_url)
                response.raise_for_status()
                
            except HTTPError as exc:
                print(f"Attempt {n+1}: HTTP error {exc.response.status_code}")
                if n == retries - 1:
                    raise
            
            except Exception as e:
                print(f"Attempt {n+1}: {e}")
                if n == retries - 1:
                    raise
            
            items = response.json()["items"]

        print(f"Downloaded {len(items)} latest readings.")
        c = 0
        for item in items:
            station_notation = item["station"].split("/")[-1]
            station_id = stations.get(station_notation)
            if not station_id:
                print(f"Station {station_notation} not found in DB, skipping.")
                break
            
            unit_name = item.get("unitName")
            reading = item.get("latestReading")
            if not reading:
                continue
            
            value = reading.get("value")
            date_time = datetime.fromisoformat(reading["dateTime"].replace("Z", "+00:00"))
            
            # Save readings to table
            cur.execute("""
                INSERT INTO readings (station_id, value, date_time, unit_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (station_id, date_time) DO NOTHING;    
            """, (station_id, value, date_time, unit_name))
            c += 1
            
    print(f"Saved {c} readings to `readings` table.")
