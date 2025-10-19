import os
import math
import pandas as pd
import time
import aiohttp
import asyncio
from tqdm.asyncio import tqdm_asyncio
from tqdm import tqdm
from sqlalchemy import create_engine, text
from dotenv import load_dotenv


from scripts.csv_loader import url_to_pd, process_historical_csv, async_csv_to_pd
from scripts.utilities import coloured_fn_name

load_dotenv()

# Get the connection string from the environment variable
CONN_STRING = os.getenv("DATABASE_URL_SQLALCHEMY")
API_ROOT = os.getenv("API_ROOT")

def insert_readings_to_db(readings_df:pd.DataFrame):
    engine = create_engine(CONN_STRING, pool_pre_ping=True)
    fn_name = coloured_fn_name("CYAN")
    
    with engine.begin() as conn:
        print(f"{fn_name} Connection established")
        
        stations_df = pd.read_sql("SELECT notation, station_id FROM stations", conn)
        stations_df["notation"] = stations_df["notation"].apply(lambda row: row.split("-")[0])
        print(f"{fn_name} Loaded {len(stations_df)} stations from the db")
        
        print(f"{fn_name} Merging dataframes")
        merged_df = readings_df.reset_index().merge(
            stations_df,
            how="inner",
            left_on="station_id",
            right_on="notation",
            suffixes=["_url", "_db"],     
        )
        merged_df = merged_df[["station_id_db", "value", "dateTime", "unit_name"]].rename(
            columns={"station_id_db": "station_id", "dateTime": "date_time"}
        )
        # print(f"{fn_name} Ensuring UTC")
        # merged_df["date_time"] = merged_df["date_time"].apply(lambda dt: dt.isoformat())
        print(f"{fn_name} Dropping duplicate values")
        merged_df = merged_df.drop_duplicates(subset=["station_id", "date_time"])
        
        chunksize = 5000
        total_rows = len(merged_df)
        num_chunks = math.ceil(total_rows / chunksize)
        
        for i in tqdm(range(num_chunks), desc=f"{fn_name} Inserting historical"):
            chunk = merged_df.iloc[i*chunksize : (i+1)*chunksize]
            chunk.to_sql(
                "readings",
                con=conn,
                if_exists="append",
                index=False,
                method="multi"
            )

def fetch_historical_daterange(date_list:list, throttle:float=1):
    fn_name = coloured_fn_name("CYAN")
    readings_list = []
    
    with tqdm(total=len(date_list), desc=f'{fn_name} Fetching') as pbar:
        for date in date_list:
            url = API_ROOT + f"/archive/readings-{date}.csv"
            df = process_historical_csv(url_to_pd(url))
            readings_list.append(df)
            pbar.set_postfix({'date': date})
            time.sleep(throttle)
            pbar.update(1)
    print()
    combined_df = pd.concat(readings_list, ignore_index=True)
    return(combined_df)

async def async_fetch_historical_daterange(date_list: list, throttle: float = 1, max_concurrent:int=5):
    fn_name = coloured_fn_name("CYAN")
    semaphore = asyncio.Semaphore(max_concurrent)
    
    print(f'{fn_name} Fetching historical information for {date_list[0]} to {date_list[-1]} ...')
    async with aiohttp.ClientSession() as session:
        tasks = []
        for date in date_list:
            url = API_ROOT + f"/archive/readings-{date}.csv"
            tasks.append(async_csv_to_pd(session, url, semaphore))
            await asyncio.sleep(throttle)

        # readings_list = await tqdm_asyncio.gather(*tasks, desc=f'{fn_name} Fetching', total=len(tasks))
        readings_list = await asyncio.gather(*tasks)

    combined_df = pd.concat(readings_list, ignore_index=True)
    return combined_df



if __name__ == "__main__":
    from pathlib import Path
    import pendulum

    start_date = pendulum.date(2025, 1, 1)
    end_date = pendulum.date(2025, 10, 17)

    date_list = [
        (start_date.add(days=i)).to_date_string() 
        for i in range((end_date - start_date).days + 1)
    ]
    combined_df = asyncio.run(async_fetch_historical_daterange(date_list, throttle=0.1, max_concurrent=10))
    # combined_df = fetch_historical_daterange(date_list, throttle=0.1)
    combined_df.to_pickle(Path(f"./.helpers/historical_{start_date.to_date_string()}_{end_date.to_date_string()}.pickle"))
    # print(combined_df.head())
    # print(combined_df.tail())
    insert_readings_to_db(combined_df)

    # --- test ---
    engine = create_engine(CONN_STRING, pool_pre_ping=True)
    with engine.connect() as conn:
        df = pd.read_sql("SELECT * FROM readings", conn)
    
    print(len(df))
        
        
        
    
        
        