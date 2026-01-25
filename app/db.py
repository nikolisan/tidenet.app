import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

load_dotenv()

def create_db_engine() -> Engine:
    """Create a new SQLAlchemy Synchronous Engine."""
    conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "")
    echo = os.getenv("DEBUG_ECHO", 'False').lower() in ('true')
    if not conn_string:
        raise ValueError("DATABASE_URL_SQLALCHEMY is not set in the environment.")
    
    engine = create_engine(
        conn_string,
        echo=echo,
        pool_pre_ping=True
    )

    # Optional connection test
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    
    return engine


def create_async_db_engine():
    """Create a new SQLAlchemy Async Engine."""
    conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "")
    echo = os.getenv("DEBUG_ECHO", 'False').lower() in ('true')
    if not conn_string:
        raise ValueError("DATABASE_URL_SQLALCHEMY is not set in the environment.")
    
    async_engine = create_async_engine(
        url = conn_string,
        echo=echo,
        pool_pre_ping=True
    )
    
    
    return async_engine

