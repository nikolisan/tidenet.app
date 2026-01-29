import os
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import sys

sys.path.append(os.path.dirname(__file__))
from fetch_latest import Reading, Station

async def check_duplicates():
    db_conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "postgresql+psycopg://postgres:1234@localhost:5432/tide")
    engine = create_async_engine(db_conn_string, echo=False)
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        # Count total readings
        total = await session.execute(select(func.count()).select_from(Reading))
        print(f"Total readings: {total.scalar()}")
        
        # Find duplicates
        query = select(
            Reading.station_id,
            Reading.date_time,
            func.count().label('count')
        ).group_by(
            Reading.station_id,
            Reading.date_time
        ).having(func.count() > 1)
        
        result = await session.execute(query)
        duplicates = result.fetchall()
        
        if duplicates:
            print(f"\nFound {len(duplicates)} duplicate combinations:")
            for station_id, date_time, count in duplicates[:10]:
                print(f"  Station {station_id}, {date_time}: {count} entries")
            await engine.dispose()
            return 1  # Exit code 1: duplicates found
        else:
            print("\nNo duplicates found")
            await engine.dispose()
            return 0  # Exit code 0: no duplicates

if __name__ == '__main__':
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    exit_code = asyncio.run(check_duplicates())
    sys.exit(exit_code)
