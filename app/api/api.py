from fastapi import APIRouter

from .endpoints import stations, data, testing

router = APIRouter(
    prefix="/api",
    tags=["api"],
    responses={404: {"description": "Not found"}},
)

router.include_router(stations.router)
router.include_router(data.router)
router.include_router(testing.router)