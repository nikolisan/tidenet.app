from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager

from app.db import create_db_engine
from .api import api

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles the asynchronous startup (connect) and shutdown (disconnect) of the 
    synchronous SQLAlchemy engine.
    """
    
    print("Initializing SQLAlchemy Synchronous Engine...")
    
    try:
        # Create the synchronous engine with connection pooling
        engine = create_db_engine()
        app.state.db_engine = engine
        # Test connection (optional, but good practice)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        print("SQLAlchemy Synchronous Engine initialized successfully.")
        
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to initialize SQLAlchemy engine. Check DATABASE_URL and driver. Details: {e}")
        
    yield # Application is now ready to serve requests

    # Shutdown phase: close connections
    if engine:
        print("Disposing SQLAlchemy Engine...")
        engine.dispose()
        print("Engine disposed.")


app = FastAPI(title="FastAPI", lifespan=lifespan)

# CORS setup (allows frontend to access the API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)