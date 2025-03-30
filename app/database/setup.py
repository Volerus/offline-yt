from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

# Create data directory if it doesn't exist
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# Database URL
DATABASE_URL = f"sqlite+aiosqlite:///{DATA_DIR}/offline_yt.db"

# Create engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Session factory
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
Base = declarative_base()

async def init_db():
    """Initialize database with tables"""
    async with engine.begin() as conn:
        # Drop all tables (comment this line for production)
        # await conn.run_sync(Base.metadata.drop_all)
        
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
        
async def get_session():
    """Dependency for API routes to get DB session"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close() 