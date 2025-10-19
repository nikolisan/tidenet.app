from pydantic import BaseModel
from datetime import datetime
from typing import List
from pydantic_extra_types.pendulum_dt import DateTime

class Reading(BaseModel):
    """Schema for a single database reading from ORM object."""
    date_time: DateTime
    value: float
    station_id: int
    station_label: str
    
    # Required for mapping ORM objects to Pydantic models
    class Config:
        from_attributes = True
        
        
class Station(BaseModel):
    label: str
    station_id: int
    date_time: datetime
    lat: float
    lon: float
    
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
