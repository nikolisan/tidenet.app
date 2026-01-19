from typing import Sequence, Optional, List, Any
import pandas as pd
import numpy as np

from sqlalchemy import CursorResult, Engine, create_engine, text
from pydantic import BaseModel, ValidationError

from utilities import coloured_fn_name

# Pydantic model for validation before insertion
class StationStat(BaseModel):
    station_id: int
    q1: float
    q3: float
    g_mean: float
    g_std: float
    lower_bound: float
    upper_bound: float




# DB Access and Retrieval
def get_station_ids(db_url:str) -> List[int]:
    engine: Engine = create_engine(db_url)
    with engine.connect() as conn:
        result: CursorResult[Any] = conn.execute(text(f"SELECT station_id FROM stations"))
    engine.dispose()
    return [station_id[0] for station_id in result]

def retrieve_station_readings(station_id: int, db_url:str) -> pd.DataFrame:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(
            text(f"SELECT date_time, value FROM readings WHERE station_id = {station_id}")
        ).mappings().all()

    df = pd.DataFrame(result)
    return df

def find_outlier_bounds(df: pd.DataFrame, factor: float = 1.5) -> tuple[float, float, float, float]:
    fn_name: str = coloured_fn_name("CYAN")
    print(f"{fn_name}: Finding outlier bounds ...")
        
    q1: float = df["value"].quantile(0.25)
    q3: float = df["value"].quantile(0.75)
    iqr: float = q3 - q1
    lower_bound: float = q1 - factor * iqr
    upper_bound: float = q3 + factor * iqr

    return lower_bound, upper_bound, q1, q3

def global_stats(df: pd.DataFrame) -> tuple[float, float]:
    fn_name: str = coloured_fn_name("CYAN")
    print(f"{fn_name}: Calculating global mean and std...")
    return df["value"].mean(), df["value"].std()

def add_row(db_url:str, payload: dict) -> None:
    fn_name: str = coloured_fn_name("CYAN")
    print(f"{fn_name}: Inserting into `station_stats`...")
    if not payload:
        print(f"{fn_name}: payload is empty.")
        return
    
    # Pydantic validation
    try:
        validated_payload = StationStat(**payload)
        insert_payload: dict[str, Any] = validated_payload.model_dump()
    except ValidationError as e:
        print(f"{fn_name}: Pydantic Validation Error.")
        print(e)
        return

    columns = ", ".join(insert_payload.keys())
    values = ", ".join([f":{key}" for key in insert_payload.keys()])
    
    sql_statement = f"""
        INSERT INTO station_stats ({columns})
        VALUES ({values});
    """
    
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            # Pass the clean, validated dictionary to the execute method
            conn.execute(
                text(sql_statement), 
                insert_payload
            )
            conn.commit()
            print(f"{fn_name}: Successfully inserted row.")
    except Exception as e:
        print(f"{fn_name}: Database Error during insert: {e}")
        
        
        
if __name__ == "__main__":
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    db_url: str = os.getenv("DATABASE_URL_SQLALCHEMY", "")

    station_ids: List = get_station_ids(db_url)

    for i, station_id in enumerate(station_ids):
        os.system('cls' if os.name == 'nt' else 'clear')
        print(f"Inserting: {station_id}: {i+1}/{len(station_ids)}")
        df: pd.DataFrame = retrieve_station_readings(station_id, db_url)
        
        if df.empty or "value" not in df.columns:
            print(f"{station_id} dataframe is empty or missing 'value' column.")
            exit()
        
        lb, ub, q1, q3 = find_outlier_bounds(df)
        mean, std = global_stats(df)
        
        add_row(db_url, payload={'station_id': station_id, 'lower_bound': lb, 'upper_bound': ub,'q1': q1,'q3': q3,'g_mean': mean,'g_std': std})
    


