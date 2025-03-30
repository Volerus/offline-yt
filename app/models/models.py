from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.setup import Base

class Channel(Base):
    """YouTube channel model"""
    __tablename__ = "channels"
    
    id = Column(String, primary_key=True)  # YouTube channel ID
    title = Column(String, nullable=False)
    thumbnail_url = Column(String)
    description = Column(Text)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    videos = relationship("Video", back_populates="channel", cascade="all, delete-orphan")
    
class Video(Base):
    """YouTube video model"""
    __tablename__ = "videos"
    
    id = Column(String, primary_key=True)  # YouTube video ID
    channel_id = Column(String, ForeignKey("channels.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    published_at = Column(DateTime, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(Integer)  # Duration in seconds
    view_count = Column(Integer)
    like_count = Column(Integer)
    local_path = Column(String)  # Path to local file if downloaded
    is_downloaded = Column(Boolean, default=False)
    downloaded_at = Column(DateTime)
    downloaded_resolution = Column(String)
    download_progress = Column(Float, default=0.0)  # 0.0 to 1.0
    
    # Relationships
    channel = relationship("Channel", back_populates="videos")
    
class UserSettings(Base):
    """User settings model"""
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True)
    download_directory = Column(String, default="downloads")
    default_resolution = Column(String, default="720p")
    max_concurrent_downloads = Column(Integer, default=2)
    auto_update_interval = Column(Integer, default=24)  # Hours
    oauth_token = Column(Text)
    oauth_token_expiry = Column(DateTime)
    last_updated = Column(DateTime, default=datetime.utcnow) 