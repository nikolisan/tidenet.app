from fastapi import APIRouter
from .endpoints import stations, data

router = APIRouter(
    prefix="/api",
    tags=["api"],
    responses={404: {"description": "Not found"}},
)

router.include_router(stations.router)
router.include_router(data.router)