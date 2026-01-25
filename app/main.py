from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio.engine import AsyncEngine

from app.db import create_async_db_engine
from .api import api
from app.dependencies.redis import redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles the asynchronous startup (connect) and shutdown (disconnect) of the 
    SQLAlchemy engine. Cleanups Redis connection.
    """
    
    print("Initializing SQLAlchemy Async Engine...")
    
    try:
        # Create the async engine and store it to the app state.
        engine: AsyncEngine = create_async_db_engine()
        app.state.db_engine = engine
        
        # Test connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        print("SQLAlchemy Synchronous Engine initialized successfully.")
        
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to initialize SQLAlchemy engine. Check DATABASE_URL and driver. Details: {e}")
        
    yield # Application is now ready to serve requests

    # Shutdown phase: close connections
    if engine:
        print("Disposing SQLAlchemy Engine...")
        await engine.dispose()
        print("Engine disposed.")
        
    # Redis shutdown
    print("Closing Redis connection...")
    await redis.close()
    print("Redis connection closed.")


app = FastAPI(
        title="FastAPI",
        lifespan=lifespan,
        openapi_version="3.0.2"
)

# CORS setup (allows frontend to access the API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("API backend started")

app.include_router(api.router)
