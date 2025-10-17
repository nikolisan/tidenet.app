import csv
import pandas as pd
import requests
from requests.exceptions import HTTPError
from io import StringIO
from pathlib import Path

def find_delim(path):
    with open(path, 'r', newline="") as csvfile:  # python 3: 'r',newline=""
        d = csv.Sniffer().sniff(csvfile.read(1024))
        csvfile.seek(0)
    return d.delimiter

def csv_to_memory(file:str | Path, delimiter:str=None, infer_delimiter:bool=True, has_header:bool=True) -> tuple[list, list, str]:
    """Read a locally cached csv into memory.

    Args:
        file (str | Path): string with the absolute path or Path object pointing to the csv file 
        delimiter (str, optional): Delimiter to be used for row splitting.
                                   Defaults to None.
        infer_delimiter (bool, optional): Try to determine the delimiter from the file contents.
                                          Defaults to True.
        has_header (bool, optional): Specify if the csv file has header.
                                     Defaults to True.

    Raises:
        ValueError: Either of `delimiter` or `infer_delimiter` must be provided. If both are provided then 
                    the `delimiter` will be overriden.
    Returns:
        tuple: A tuple containing:
            - list: Header labels, or an empty list if `has_header` is False.
            - list: Data rows.
            - str : CSV file delimiter  
    """
    
    if not delimiter and not infer_delimiter:
        raise ValueError("Either `delimiter` or `infer_delimiter` must be provided.")
    if delimiter and infer_delimiter:
        print(f" [csv-loader]  Warning: `infer_delimiter` will override the provided {delimiter=}")
    if infer_delimiter:
        delimiter = find_delim(file)
    
    header = []
    with open(file, 'r') as csvfile:
        if has_header:
            header = csvfile.readline().strip().split(delimiter)
        data = [line.strip().split(delimiter) for line in csvfile.readlines()]
    
    return header, data, delimiter

def csv_to_pd(file:str | Path, delimiter:str=None, has_header:bool|int=True) -> pd.DataFrame:
    """Read a locally cached csv into a pandas dataframe.

    Args:
        file (str | Path): string with the absolute path or Path object pointing to the csv file 
        delimiter (str, optional): Delimiter to be used for row splitting.
                                   Defaults to None.
        has_header (bool | int, optional): Specify if a header row is present, or specify the row 
                                           number to create the column names. Defaults to True.

    Raises:
        TypeError: `has_header` must be bool or int

    Returns:
        pd.DataFrame: Dataframe containing the csv data
    """

    if isinstance(has_header, bool) and has_header:
        header=0
    elif isinstance(has_header, bool) and not has_header:
        header=None
    elif isinstance(has_header, int):
        header=has_header
    else:
        raise TypeError(f"[csv_to_pd]: `has_header` must be bool or int type.")
    
    return pd.read_csv(file, sep=delimiter, header=header, engine='python')

def url_to_pd(url:str, retries:int=5, delimiter:str=None, has_header:bool|int=True) -> pd.DataFrame:
    if isinstance(has_header, bool) and has_header:
        header=0
    elif isinstance(has_header, bool) and not has_header:
        header=None
    elif isinstance(has_header, int):
        header=has_header
    else:
        raise TypeError(f"[csv_to_pd]: `has_header` must be bool or int type.")
    
    for n in range(retries):
        try:
            response = requests.get(url)
            response.raise_for_status()
        except HTTPError as exc:
            print(f"[url_to_pd] Attempt {n+1}: HTTP error {exc.response.status_code}")
            if n == retries - 1:
                raise
        except Exception as e:
            print(f"Attempt {n+1}: {e}")
            if n == retries - 1:
                raise
        
        data = StringIO(response.content.decode("utf-8"))
        
        return pd.read_csv(data, sep=delimiter, header=header, engine='python')

def process_historical_csv(df: pd.DataFrame) -> pd.DataFrame:
    def _convert_to_float(x):
        try:
            return float(x)
        except (ValueError, TypeError):
            return float("nan")
        
    df["value"] = df["value"].apply(_convert_to_float)
    df = df.dropna(subset=["value"]).copy()

    # Extract station_id and unit_name safely
    df["station_id"] = df["measure"].apply(lambda row: row.split("/")[-1].split("-")[0])
    df["unit_name"] = df["measure"].apply(lambda row: row.split("/")[-1].split("-")[-1])
    df = df.drop("measure", axis=1)
    df = df[df["unit_name"]=="mAOD"]
    df["dateTime"] = pd.to_datetime(df["dateTime"], utc=True)
    df = df[["dateTime", "station_id", "value", "unit_name"]]
    return df

async def async_csv_to_pd(session, url, semaphore, delimiter=None, header=0):
    async with semaphore:  # limit concurrency
        async with session.get(url) as response:
            response.raise_for_status()
            text = await response.text()
            df = pd.read_csv(StringIO(text),
                             dtype={"dateTime": "string", "measure": "string", "value": "string"})           
            return process_historical_csv(df)


if __name__ == '__main__':
    file = Path("./data/readings-2025-01-01.csv")
    df = csv_to_pd(file)
    df = process_historical_csv(df)
    print(df.head())