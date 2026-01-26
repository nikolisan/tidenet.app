
import utide
import pandas as pd
import numpy as np
import os
import json
from typing import Any
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

from matplotlib import pyplot as plt

load_dotenv()

from utide.utilities import Bunch

def create_tidal_prediction_for_station(station_label, dates):
    with open(f"coef_{station_label}.json", "r") as f:
        json_data = json.load(f)
    coef = json_to_utide_coef(json_data)
    t = utide.reconstruct(dates, coef, verbose=False)
    return t.h


def json_to_utide_coef(data, is_bunch=True):
    '''
    Function to transform coefficient values from JSON to utide.Bunch
    '''
    # 1. If it's a list convert to numpy array
    if isinstance(data, list):
        return np.array(data)
    
    # 2. If it's a dictionary, we decide its container type
    if isinstance(data, dict):
        # We create a standard dict first
        processed = {}
        for k, v in data.items():
            # Only 'aux' should trigger a Bunch for its children
            should_child_be_bunch = (k == 'aux')
            processed[k] = json_to_utide_coef(v, is_bunch=should_child_be_bunch)
        
        # Wrap in Bunch only if specified (for Root and Aux)
        return Bunch(processed) if is_bunch else processed
    # 3. Primitives
    return data


def utide_coef_to_json(obj: Any) -> Any:
    '''
    Function to serialise a utide.Bunch coefficient object
    '''
    # Handle NumPy arrays (A, g, A_ci, etc.)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    
    # Handle NumPy scalars (mean, slope)
    if isinstance(obj, (np.float64)):
        return float(obj)
    
    # Handle UTide's Bunch object and standard dicts (aux, diagn)
    # Both support the .items() iteration
    if hasattr(obj, 'items'):
        return {k: utide_coef_to_json(v) for k, v in obj.items()}
    
    # Handle lists or tuples
    if isinstance(obj, (list, tuple)):
        return [utide_coef_to_json(i) for i in obj]
    
    # Standard Python types (int, str) are fine as-is
    return obj


def get_stations_from_db(db_url: str) -> pd.DataFrame:
    '''
    Retrieve the list of stations from the db.
    
    :param db_url: Database connection string
    :return: Dataframe with cols: station_id, label, notation, lat
    '''
    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            result = conn.execute(text("select station_id, label, notation, lat from stations")).mappings().all()
        df = pd.DataFrame(result)
        return df
    except Exception as e:
        print(e)
        return pd.DataFrame()
    finally:
        engine.dispose()

        
def retrieve_station_readings(station_id: int, db_url:str) -> pd.DataFrame:
    '''
    Retrieve all the readings for a station
    
    :param station_id (int): Station id of the station in the db
    :param db_url (str): DB connection string
    :type db_url: str
    :return: Dataframe with cols date_time (datetime.datetime), value (float)
    '''
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(
            text(f"SELECT date_time, value FROM readings WHERE station_id = {station_id}")
        ).mappings().all()

    df = pd.DataFrame(result)
    df = df.sort_values(by="date_time")
    df["date_time"] = pd.to_datetime(df["date_time"], utc=True)
    return df



if __name__ == '__main__':
    from numpy.linalg import LinAlgError
    
    def print_progress(name:str, done: int, total: int, bar_len: int = 30):
        frac = 0 if total == 0 else done / total
        filled = int(bar_len * frac)
        bar = "#" * filled + "." * (bar_len - filled)
        print(f"[{bar}] {done}/{total} - {name} {10*" "}", end="\r", flush=True)
    
    
    # Get the connection string from the environment variable
    CONN_STRING = os.getenv("DATABASE_URL_SQLALCHEMY", "postgresql+psycopg://postgres:1234@localhost:5432/tide")
    COEF_DIR = "app\\tide-data\\coef"
    
    if not os.path.exists(COEF_DIR):
        os.makedirs(COEF_DIR)
    
    stations = get_stations_from_db(CONN_STRING)
    station_ids = stations["station_id"]

    done = 0
    print_progress("", done, len(station_ids))
    
    for station_id in station_ids:
        station_label = stations.loc[stations["station_id"] == station_id]["label"].values[0]
                
        lat = stations.loc[stations["station_id"] == station_id]["lat"].values[0]
        station_readings = retrieve_station_readings(station_id,CONN_STRING)
        # station_readings.dropna(inplace=True)       
        try:
            coef = utide.solve(
                station_readings["date_time"].values,
                station_readings["value"].values,
                lat=lat,
                method="ols",
                conf_int='MC',
                nodal=True,
                verbose=False
            )
        except LinAlgError as err:
            coef = utide.solve(
                station_readings["date_time"].values,
                station_readings["value"].values,
                lat=lat,
                method="ols",
                conf_int='linear',
                nodal=True,
                verbose=False
            )
        output_file_path = os.path.join(COEF_DIR, f"coef_{station_id}_{station_label.replace(" ", "-")}.json")

        # Save coef to json
        with open(output_file_path, "w") as f:
            json.dump(utide_coef_to_json(coef), f)
        
        done += 1
        print_progress(station_label, done, len(station_ids))

    print("Finished")
        