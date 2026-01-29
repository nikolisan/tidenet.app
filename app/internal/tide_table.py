import utide
import numpy as np
import pandas as pd
from scipy.signal import argrelextrema

from tide_constants import json_to_utide_coef

def _predict_series(coef, start, end, freq="15min", tz="UTC"):
    '''
    Reconstruct the astronomical tide for a given date range
    '''
    t = pd.date_range(start=start, end=end, freq=freq, tz=tz).tz_localize(None)
    h = utide.reconstruct(t, coef, verbose=False).h
    return pd.DataFrame({"t": t, "h": h})

def _extract_extrema(df):
    y = df["h"].to_numpy()
    # sign changes of the first derivative mark turning points using a fast 1st order approximation
    dy = np.diff(y)
    sign = np.sign(dy)
    change = np.diff(sign)
    high_idx = np.where(change == -2)[0] + 1
    low_idx = np.where(change == 2)[0] + 1
    highs = df.iloc[high_idx].assign(kind="H")
    lows = df.iloc[low_idx].assign(kind="L")
    
    return pd.concat([highs, lows]).sort_values("t").reset_index(drop=True)

def _daily_extreme_stats(peaks):
    '''
    Calculates the average High Water and the average Low Water each day
    In each day we expect 2 highs and 2 lows.
    It also computes useful stats such as the max Range <- will be used to determing the neaps and the springs
    '''
    days = peaks["t"].dt.floor("D")
    highs = peaks.loc[peaks.kind == "H"].copy()
    lows = peaks.loc[peaks.kind == "L"].copy()

    # Group by day
    Hmax = highs.groupby(days.loc[highs.index]).h.max()
    Havg = highs.groupby(days.loc[highs.index]).h.mean()
    Lmin = lows.groupby(days.loc[lows.index]).h.min()
    Lavg = lows.groupby(days.loc[lows.index]).h.mean()

    daily = pd.DataFrame({"Hmax": Hmax, "Havg": Havg, "Lmin": Lmin, "Lavg": Lavg}).dropna()
    daily["range"] = daily["Hmax"] - daily["Lmin"]
    return daily

def _spring_neap_days(daily: pd.DataFrame) -> tuple[pd.DatetimeIndex, pd.DatetimeIndex]:
    r = daily["range"]
    
    # Smoothing with a rolling window to remove slight deviations in range
    # smooth = r.rolling(3, center=True, min_periods=1).mean()
    
    springs = r.index[argrelextrema(r.to_numpy(), np.greater, order=2)]
    neaps = r.index[argrelextrema(r.to_numpy(), np.less, order=2)]
    
    return springs, neaps

def tidal_means(coef, start, end, freq="10min", tz="UTC", datum_offset: float = 0.0):
    """
    Returns MHWS, MHWN, MLWS, MLWN computed from predicted tides between start/end.
    Use at least one full year for stable averages.
    """
    series = _predict_series(coef, start, end, freq=freq, tz=tz)
        
    peaks = _extract_extrema(series)

    daily = _daily_extreme_stats(peaks)
        
    springs, neaps = _spring_neap_days(daily)

    peaks["day"] = peaks["t"].dt.floor("D")
    
    # Compute daily mean highs/lows first, then average over selected days
    Havg_by_day = daily["Havg"]
    Lavg_by_day = daily["Lavg"]
    
    MHWS = float(np.round(daily["Havg"].reindex(springs).dropna().mean(),1))
    MLWS = float(np.round(daily["Lavg"].reindex(springs).dropna().mean(),1))
    MHWN = float(np.round(daily["Havg"].reindex(neaps).dropna().mean(),1))
    MLWN = float(np.round(daily["Lavg"].reindex(neaps).dropna().mean(),1))

    return {"MHWS": MHWS, "MHWN": MHWN, "MLWS": MLWS, "MLWN": MLWN, "srange": MHWS - MLWS, "nrange": MHWN - MLWN}


if __name__ == "__main__":
    import json
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from pathlib import Path
    
    COEF_DIR = Path("./app/tide-data/coef")
    TABLE_DIR = Path("./app/tide-data/tide-tables")
    TABLE_DIR.mkdir(parents=False, exist_ok=True)

    coef_files = list(COEF_DIR.rglob("coef*.json"))

    def calculate_table_for_station(coef_file: Path):
        with open(coef_file, "r") as f:
            coef = json_to_utide_coef(json.load(f))

        stats = tidal_means(coef, start="2010-01-01", end="2026-01-01", freq="30min", tz="UTC")

        ttable_filename = coef_file.stem.replace("coef", "ttable")
        ttable_file = TABLE_DIR.joinpath(ttable_filename)
        with open(ttable_file, "w") as f:
            json.dump(stats, f)

    def print_progress(done: int, total: int, bar_len: int = 30):
        frac = 0 if total == 0 else done / total
        filled = int(bar_len * frac)
        bar = "#" * filled + "." * (bar_len - filled)
        print(f"[{bar}] {done}/{total}", end="\r", flush=True)

    total = len(coef_files)
    done = 0
    workers = min(8, max(1, total))
    print_progress(0, total)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(calculate_table_for_station, cf) for cf in coef_files]
        for _ in as_completed(futures):
            done += 1
            print_progress(done, total)
    if total:
        print_progress(total, total)
        print()  # newline after progress bar