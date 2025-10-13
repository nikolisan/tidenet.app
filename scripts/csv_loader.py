from pathlib import Path

def csv_loader(file:Path, delimiter:str=';', has_header:bool=True) -> tuple[list, list]:
    """
    Read a locally cached CSV file into memory.

    Args:
        file (str): Path to the local file.
        delimiter (str): The delimiting character.
        had_header (bool): Flag to indicate the presence of header row.

    Returns:
        tuple: A tuple containing:
            - list: Header labels, or an empty list if `has_header` is False.
            - list: Data rows.
    """
    with open(file, 'r') as csvfile:
        header = []
        if has_header:
            header = csvfile.readline().strip().split(delimiter)
        data = [line.strip().split(delimiter) for line in csvfile.readlines()]
    
    return header, data

