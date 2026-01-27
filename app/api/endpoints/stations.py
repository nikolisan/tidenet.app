import os
import json

from typing import Dict, Any, Optional
from sqlalchemy.engine.row import RowMapping
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection
from sqlalchemy import text, CursorResult, MappingResult

from fastapi import HTTPException, APIRouter, Request, Depends
from dotenv import load_dotenv
from app.dependencies.redis import get_redis
from app.models import Station

load_dotenv()
CACHE_TIME_LIMIT = int(os.getenv("CACHE_TIME_LIMIT", 3600))


router = APIRouter(
    prefix="/stations",
    tags=["stations"],
    responses={404: {"description": "Not found"}},
)


@router.get("/")
async def get_stations(request: Request, redis=Depends(get_redis)) -> Dict[str, Any]:
    """
    Function to list all stations along with their metadata and latest readings
    """
    # --- Redis Caching ---
    # Search for a cached data in redis
    cache_key = "stations:all"
    cached: Optional[bytes] = await redis.get(cache_key)
    if cached:
        # Return cached station dict
        print(" ===> Loaded the stations from REDIS")
        cached_obj = json.loads(cached)
        # Ensure alphabetical order by label even when served from cache
        return dict(sorted(cached_obj.items(), key=lambda item: item[0].lower()))

    try:
        # Retrieve the db_engine stored in the state of the app associated with this request
        engine: Optional[AsyncEngine] = getattr(request.app.state, "db_engine", None)
        
        if engine is None:
            raise HTTPException(status_code=503, detail="Database engine unavailable")
        
        query: str = """
            SELECT DISTINCT ON (s.station_id)
                s.label,
                s.station_id,
                r.date_time AS latest_reading,
                r.value,
                s.lat,
                s.long
            FROM stations s
            JOIN readings r ON s.station_id = r.station_id
            ORDER BY
                s.station_id,
                r.date_time DESC,
                s.label ASC;
        """
        
        async with engine.connect() as conn:
            conn:AsyncConnection
            
            station_list = []
            stations:Dict[str, Any] = {}
            result: CursorResult = await conn.execute(text(query))
            rows: MappingResult = result.mappings()
            
            
            
            for row in rows:
                row: RowMapping
                # Convert datetime fields to ISO strings for JSON serialization
                station_obj = Station(
                    label=row["label"],
                    station_id=row["station_id"],
                    date_time=row["latest_reading"].isoformat(),
                    latest_reading=row["value"],
                    lat=row["lat"],
                    lon=row["long"]
                )
                station_list.append((str(row["label"]), station_obj.model_dump()))

            # Sort alphabetically by label before returning and caching
            station_list.sort(key=lambda item: item[0].lower())
            stations = {label: data for label, data in station_list}
                
        # Cache the stations dict as JSON
        await redis.set(cache_key, json.dumps(stations), ex=CACHE_TIME_LIMIT)    
        return stations
    
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error fetching stations: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data retrieval.")