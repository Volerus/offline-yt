import asyncio
from app.database.setup import Base, engine
from app.models.models import Channel, Video, UserSettings  # Import models to register them

async def clear_db():
    """Clear database by dropping and recreating all tables"""
    print("Clearing database...")
    async with engine.begin() as conn:
        # Drop all tables
        await conn.run_sync(Base.metadata.drop_all)
        # Create tables again
        await conn.run_sync(Base.metadata.create_all)
    print("Database cleared successfully!")

if __name__ == "__main__":
    asyncio.run(clear_db()) 