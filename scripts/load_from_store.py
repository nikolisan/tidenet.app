from tqdm import tqdm
from typing import Literal, Any, List
import pickle
import math
from turtle import color
import pandas as pd
from pathlib import Path
from sqlalchemy import Inspector, create_engine, text, inspect
from sqlalchemy.exc import IntegrityError, OperationalError

def colours(colour):
    return {
        'CYAN': '\033[96m',
        'RED' : '\033[31m',
        'GREEN': '\033[32m',
        'MAGENTA': '\033[35m',
        'BOLD': '\033[1m',
        'ITALIC': '\033[3m',
        'ENDC': '\033[0m',
    }.get(colour, 0)
    
    
def coloured_filename():
    return f"{colours("ITALIC")}{colours("GREEN")}{Path(__file__).stem}{colours("ENDC")}"


def get_stations_from_db(db_url: str) -> pd.DataFrame:
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            result = conn.execute(text("select station_id, notation from stations")).mappings().all()
        df = pd.DataFrame(result)
        return df
    except Exception as e:
        print(e)
        return pd.DataFrame()
    finally:
        engine.dispose()


def create_concat_df(pickle_paths: List[Path], stations: pd.DataFrame, substring_replace: List = [], lower_threshold: float = -20.0, upper_threshold: float = 50.0) -> pd.DataFrame:
    if not isinstance(stations, pd.DataFrame) or stations.empty:
        raise ValueError(f"{coloured_filename()}.create_concat_df: stations dataframe is not provided")
    
    if not pickle_paths or not isinstance(pickle_paths, List):
        raise ValueError(f"{coloured_filename()}.create_concat_df: pickle_path list is not provided")
    
    dfs: List[pd.DataFrame] = []
    for f in pickle_paths:
        with open(f, "rb") as pf:
            df: pd.DataFrame = pickle.load(pf)
            dfs.append(df)

    if not dfs:
        print("No pickles found.")
        return pd.DataFrame()
    
    full_df: pd.DataFrame = pd.concat(dfs, ignore_index=True)

    # Drop duplicate rows based on the combination of "station_id" and "date_time"
    full_df = full_df.drop_duplicates(subset=["station_id", "dateTime"])
    
    full_df = full_df[(full_df["value"] >= lower_threshold) & (full_df["value"] <= upper_threshold)]

    stations = stations.replace(dict(zip(substring_replace, [x.split("-")[0] for x in substring_replace])))
    
    full_df = full_df.merge(
        right=stations,
        how='inner',
        right_on='notation',
        left_on='station_id',
        suffixes=["_pickle", "_stations"]
    )
    full_df = full_df.rename(columns={'station_id_pickle': 'notation_pickle', 'station_id_stations': 'station_id', 'dateTime': 'date_time'})
    full_df = full_df.drop(columns='notation_pickle')
    full_df = full_df.sort_values(by=["date_time", "station_id"])
    full_df = full_df.reset_index(drop=True)
    print(f"💠 Loaded {full_df.shape[0]} rows from {len(pickle_paths)} pickles.")

    return full_df


def load_pickles_to_db(full_df: pd.DataFrame, db_url: str, table_name: str = "readings", chunk_size: int = 10000, retries: int = 3, if_exists: Literal["fail", "delete"] = "delete"):

    engine = create_engine(db_url)
    
    inspector: Inspector = inspect(engine)
    tables: List[str]= inspector.get_table_names()
            
    with engine.connect() as conn:
        for n in range(retries):
            try:
                if table_name in tables:
                    row_count: int = int(conn.scalar(text(f"SELECT COUNT(*) from {table_name}")))
                    if row_count == len(full_df):
                        if if_exists == "fail":
                            raise KeyError(f"❗ Table {colours("CYAN")}`{table_name}`{colours("ENDC")} exists and has all the values.")
                        elif if_exists == "delete":
                            print(f"❗ Dropping {colours("CYAN")}`{table_name}`{colours("ENDC")}...")
                            conn.execute(text(f"DELETE FROM {table_name}"))
                        else:
                            raise KeyError(f"❗ Not recognised parameter: {colours("MAGENTA")}if_exists{colours("ENDC")} = {colours("CYAN")}`{if_exists}`{colours("ENDC")}")
                    else:
                        print(f"💠 {colours("CYAN")}`{table_name}`{colours("ENDC")} is empty.")
                                         
                total_rows: int = len(full_df)
                num_chunks: int = math.ceil(total_rows / chunk_size)

                for i in tqdm(range(num_chunks), desc=f"💠 Inserting to {colours("CYAN")}`{table_name}`{colours("ENDC")}"):
                    chunk: pd.DataFrame = full_df.iloc[i*chunk_size : (i+1)*chunk_size]
                    chunk.to_sql(
                        table_name,
                        con=conn,
                        if_exists="append",
                        index=False,
                        method="multi"
                )

                print(f"✅ Inserted {total_rows} readings to {colours("CYAN")}`{table_name}`{colours("ENDC")} successfully.")
                conn.commit()
                break
            
            except IntegrityError as e:
                print(f"❌ {colours("RED")}Duplicate values detected in `{table_name}`.{colours("ENDC")}")
                conn.rollback()
            except OperationalError as e:
                chunk_size = math.ceil(chunk_size / 2)
                print(f"❌ {colours("RED")}Error inserting DataFrame to `{table_name}`{colours("ENDC")}:\n\t{e.__class__.__name__}: reducing chunk_size to {chunk_size}")
            except KeyError as e:
                print(e.args[0])
                break
            except Exception as e:
                print(f"❌ {colours("RED")}Unhandled exception occured{colours("ENDC")}: {e.__class__.__name__}")
            
        else:
            print(f"❌ {colours("RED")}Failed to insert DataFrame to `{table_name}`{colours("ENDC")}")
            conn.rollback()
            
    engine.dispose()


def test_pickles_in_db(db_url: str, table_name: str = "readings") -> Any:
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            row_count = result.scalar()
            return row_count
    except Exception as e:
        print(f"Error testing table {table_name}:\n{e}")
        return 0
    finally:
        engine.dispose()
       
    
# TODO: Fix the threshold detection: Use outliers
# eg. Lerwick has on average high water at + 1.5m and dataset has +10.7m at 27/10/2025
# the same for low water

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    print(f"{coloured_filename()}")
    
    load_dotenv()
    
    upper_threshold = float(os.getenv("UPPER_THRESHOLD", "50"))
    lower_threshold = float(os.getenv("LOWER_THRESHOLD", "-20"))
    db_url: str = os.getenv("DATABASE_URL_SQLALCHEMY", "")
        
    if not db_url:
        raise ValueError(f"❌ {coloured_filename()}: {colours("MAGENTA")}DATABASE_URL_SQLALCHEMY{colours("ENDC")} is not set in the environment.")
    

    stations: pd.DataFrame = get_stations_from_db(db_url)
    if stations.empty:
        raise ValueError(f"❌ {coloured_filename()}: Could not load stations from the db.")
    
    substring_replace: List[str] = stations[stations["notation"].str.contains("anglian")]["notation"].to_list()
    
    pickles: list[Path] = sorted(Path("./.helpers").rglob("historical_*.pickle"))
        
    full_df: pd.DataFrame = create_concat_df(pickle_paths=pickles, stations=stations, substring_replace=substring_replace, lower_threshold=lower_threshold, upper_threshold=upper_threshold)

    if full_df.empty:
        raise ValueError(f"❌ {coloured_filename()}: Could not concat the dataframe.")
    
    load_pickles_to_db(full_df=full_df, db_url=db_url, table_name="readings", chunk_size=12000, if_exists='delete')
    
    # Testing:
    stored = test_pickles_in_db(db_url)
    if not stored == len(full_df):
        raise ValueError(f"❌ {coloured_filename()}: Test failed => Stored {colours("MAGENTA")}{stored}{colours("ENDC")} rows instead of {colours("MAGENTA")}{len(full_df)}{colours("ENDC")}.")
    
