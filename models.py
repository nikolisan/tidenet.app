from pydantic import BaseModel
from datetime import datetime
from typing import List


class Reading(BaseModel):
    """Schema for a single database reading from ORM object."""
    date_time: datetime 
    value: float
    station_id: int
    station_label: str
    
    # Required for mapping ORM objects to Pydantic models
    class Config:
        from_attributes = True

class StationDataResponse(BaseModel):
    """Schema for the final API response containing chart data."""
    station_id: int
    station_label: str
    date_time: List[str]
    values: List[float]
    unit: str
