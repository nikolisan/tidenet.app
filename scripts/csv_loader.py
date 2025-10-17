import csv
import pandas as pd
from pathlib import Path

def find_delim(path):
    with open(path, 'r', newline="") as csvfile:  # python 3: 'r',newline=""
        d = csv.Sniffer().sniff(csvfile.read(1024))
        csvfile.seek(0)
    return d.delimiter

def csv_to_pd(file:str | Path, delimiter:str=None, infer_delimiter:bool=True, has_header:bool=True) -> tuple[list, list, str]:
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

