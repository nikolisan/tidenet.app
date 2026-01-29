import os
import asyncio
import aiohttp
import pendulum
from datetime import timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.asyncio.engine import AsyncEngine
from contextlib import asynccontextmanager
from typing import Dict, List, Any, cast

from models import Reading, Station


@asynccontextmanager
async def create_async_db_engine(conn_string: str):
    """Create a new SQLAlchemy Async Engine."""
       
    if not conn_string:
        raise ValueError("DATABASE_URL_SQLALCHEMY is not set in the environment.")
    
    print("Starting db engine ...", end=' ')
    try:
        async_engine: AsyncEngine = create_async_engine(
            url = conn_string,
            echo= False,
            pool_pre_ping=True
        )
    except Exception as err:
        print(f"Error: {err}")
        raise
    
    print("Engine started.")
    
    yield async_engine
    
    print("Disposing db engine ...", end=' ')
    try:
        await async_engine.dispose()
    except Exception as err:
        print(f"Error: {err}")
        raise
    print("Engine disposed.")


async def retrieve_latest_reading_datetime(engine: AsyncEngine):
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        query = select(Station.station_id, Station.notation).order_by(Station.station_id)
        result = await session.execute(query)
        stations = result.fetchall()
        
        latest_date = {}
        for (station_id, station_notation) in stations:
            reading_query = select(Reading.date_time).where(
                Reading.station_id == station_id
            ).order_by(Reading.date_time.desc()).limit(1)
            
            reading_result = await session.execute(reading_query)
            row = reading_result.first()
            
            if row:
                dt = row[0].astimezone(timezone.utc)
                latest_date[station_notation] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        return latest_date


async def retrieve_latest_readings_from_station(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, station_notation: str, date_time: str, offset: int = 0) -> List[Dict[str, Any]]:
    '''
    Retrieve the latest readings for a station from the EA Tide API
    '''
    
    url = f"https://environment.data.gov.uk/flood-monitoring/id/stations/{station_notation}/readings?since={date_time}&_limit=500&_offset={offset}"
    
    max_retries = 5
    timeout = aiohttp.ClientTimeout(total=20.0)
    
    async with semaphore:
        for attempt in range(max_retries):
            try:
                async with session.get(url, timeout=timeout) as res:
                    res.raise_for_status()
                    data = await res.json()
                    return data.get("items", [])
                    
            except asyncio.TimeoutError:
                print(f"  [INFO] {station_notation} | Timeout (attempt {attempt+1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise
            except aiohttp.ClientConnectorDNSError as err:
                print(f"  [DEBUG] {station_notation} | DNS Connection Error: {err}")
                raise
            except aiohttp.ClientResponseError as err:
                print(f"  [DEBUG] {station_notation} | HTTP {err.status}: {err.message}")
                if attempt == max_retries - 1:
                    raise
            except aiohttp.ClientError as err:
                print(f"  [DEBUG] {station_notation} | Client Error: {err}")
                if attempt == max_retries - 1:
                    raise
            except Exception as err:
                print(f"  [ERROR] {station_notation} | Unexpected {type(err).__name__}: {err}")
                if attempt == max_retries - 1:
                    raise
        
        return []


async def fetch_station_data_task(session: aiohttp.ClientSession, semaphore: asyncio.Semaphore, station_notation: str, date_time: str) -> Dict[str, List[Any]]:
    ''' Task for the concurrent data fetching '''
    try:
        print(f"Fetching data for {station_notation}")
        items = []
        req_counter = 1
        response_items = await retrieve_latest_readings_from_station(session, semaphore, station_notation, date_time, offset=0)
        items.extend(response_items)
        
        while len(response_items) == 500:
            print(f"{station_notation}: Page {req_counter+1}", end="\r")
            response_items = await retrieve_latest_readings_from_station(session, semaphore, station_notation, date_time, offset=req_counter*500)
            items.extend(response_items)
            req_counter += 1
        
        return {station_notation : items}
    
    except Exception as err:
        print(f"\n[ERROR] {station_notation} failed: {type(err).__name__}")
        return {station_notation : []}


async def insert_readings_to_db(engine: AsyncEngine, all_results: List[Dict[str, List[Any]]]) -> int:
    """
    Insert readings into the database using ORM, filtering for whole hours only.
    """
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        # Get station_id mapping from notation
        result = await session.execute(select(Station.station_id, Station.notation))
        station_map = {row[1]: row[0] for row in result.fetchall()}
        
        total_inserted = 0

        for result_dict in all_results:
            for notation, readings in result_dict.items():
                print()
                print(f"Inserting readings for {notation}...", end=' ')
                station_id = station_map.get(notation)
                if not station_id:
                    print(f"  [WARNING] Station {notation} not found in database")
                    continue
                
                # Filter for whole hours only (minute == 0 and second == 0)
                readings_to_insert = []
                for reading in readings:
                    dt: pendulum.DateTime = cast(pendulum.DateTime, pendulum.parse(reading['dateTime']))
                    if dt.minute == 0 and dt.second == 0:
                        # Extract unit from measure URL
                        unit_name: str = reading['measure'].split('-')[-1] if 'measure' in reading else 'mAOD'
                        readings_to_insert.append(
                            Reading(
                                station_id=station_id,
                                value=reading['value'],
                                date_time=dt,
                                unit_name=unit_name,
                                notation=notation
                            )
                        )
                
                # Insert to database
                if readings_to_insert:
                    # Check which readings already exist
                    existing_times_query = select(Reading.date_time).where(
                        Reading.station_id == station_id,
                        Reading.date_time.in_([r.date_time for r in readings_to_insert])
                    )
                    existing_result = await session.execute(existing_times_query)
                    existing_times = {row[0] for row in existing_result.fetchall()}
                    
                    # Filter out existing readings
                    new_readings = [r for r in readings_to_insert if r.date_time not in existing_times]
                    
                    if new_readings:
                        session.add_all(new_readings)
                        await session.flush()
                        total_inserted += len(new_readings)
                        print(f"  [INFO] {notation}: Inserted {len(new_readings)} readings (skipped {len(existing_times)} duplicates)")
                    else:
                        print(f"  [INFO] {notation}: All {len(readings_to_insert)} readings already exist (skipped)")

        await session.commit()
    
    return total_inserted


async def main(db_conn_string: str, max_concurrent_requests: int = 5):
    
    # Get latest reading timestamps from database
    async with create_async_db_engine(db_conn_string) as async_engine:
        latest_datetime_dict: Dict[str, str] = await retrieve_latest_reading_datetime(async_engine)
    
    
        async with aiohttp.ClientSession() as session:
            latest_datetime_dict = {"E70039": "2026-01-27T23:00:00Z"}
            
            semaphore = asyncio.Semaphore(max_concurrent_requests)
            tasks = [
                fetch_station_data_task(session, semaphore, notation, date) for notation, date in latest_datetime_dict.items()
            ]

            all_results = await asyncio.gather(*tasks)
        
        # Insert fetched data into database
        
        total_inserted = await insert_readings_to_db(async_engine, all_results)
        print(f"\n[INFO] Total readings inserted: {total_inserted}")




if __name__ == '__main__':
    import sys
    import time
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    db_conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "postgresql+psycopg://postgres:1234@localhost:5432/tide")
    max_concurrent_requests = 5
    
    start = time.perf_counter()
    asyncio.run(main(db_conn_string, max_concurrent_requests))
    print(f"{time.perf_counter() - start:.2f}s")
