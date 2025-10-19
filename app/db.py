import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

load_dotenv()

def create_db_engine() -> Engine:
    """Create a new SQLAlchemy Engine."""
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