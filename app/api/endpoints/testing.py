from fastapi import HTTPException, APIRouter, Request


router = APIRouter(
    prefix="/testing",
    tags=["testing"],
    responses={404: {"description": "Not found"}},
)


@router.get("/")
def testing(request: Request):
    print(request)
    return {"message": "Hello World"}