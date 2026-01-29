import os
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from models import Reading
import sys

sys.path.append(os.path.dirname(__file__))



async def remove_duplicates():
    db_conn_string = os.getenv("DATABASE_URL_SQLALCHEMY", "postgresql+psycopg://postgres:1234@localhost:5432/tide")
    engine = create_async_engine(db_conn_string, echo=False)
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        # Find all duplicate (station_id, date_time) combinations
        duplicate_query = select(
            Reading.station_id,
            Reading.date_time,
            func.count().label('count')
        ).group_by(
            Reading.station_id,
            Reading.date_time
        ).having(func.count() > 1)
        
        result = await session.execute(duplicate_query)
        duplicates = result.fetchall()
        
        if not duplicates:
            print("No duplicates found")
            await engine.dispose()
            return
        
        print(f"Found {len(duplicates)} duplicate combinations")
        print("Removing duplicates...")
        
        total_deleted = 0
        
        for station_id, date_time, count in duplicates:
            # Get all readings for this combination
            readings_query = select(Reading).where(
                Reading.station_id == station_id,
                Reading.date_time == date_time
            )
            readings_result = await session.execute(readings_query)
            readings = readings_result.scalars().all()
            
            # Keep the first one, delete the rest
            for reading in readings[1:]:
                await session.delete(reading)
                total_deleted += 1
        
        await session.commit()
        print(f"Deleted {total_deleted} duplicate readings")
        
        # Verify
        verify_result = await session.execute(duplicate_query)
        remaining = verify_result.fetchall()
        
        if remaining:
            print(f"WARNING: Still have {len(remaining)} duplicates")
        else:
            print("All duplicates removed successfully")
    
    await engine.dispose()


if __name__ == '__main__':
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(remove_duplicates())
