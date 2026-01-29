import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def add_primary_key():
    db_conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "postgresql+psycopg://postgres:1234@localhost:5432/tide")
    engine = create_async_engine(db_conn_string, echo=True)
    
    async with engine.begin() as conn:
        # Check current constraints
        print("Checking current constraints...")
        result = await conn.execute(text("""
            SELECT conname, contype, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'readings'::regclass;
        """))
        constraints = result.fetchall()
        
        print("\nCurrent constraints on 'readings' table:")
        if constraints:
            for name, type, definition in constraints:
                print(f"  {name} ({type}): {definition}")
        else:
            print("  No constraints found")
        
        # Add primary key constraint
        print("\nAdding PRIMARY KEY constraint...")
        try:
            await conn.execute(text("""
                ALTER TABLE readings 
                ADD CONSTRAINT readings_pkey PRIMARY KEY (station_id, date_time);
            """))
            print("✓ Primary key constraint added successfully")
        except Exception as e:
            if "already exists" in str(e):
                print("⚠ Primary key constraint already exists")
            else:
                print(f"✗ Error: {e}")
                raise
    
    await engine.dispose()


if __name__ == '__main__':
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(add_primary_key())
