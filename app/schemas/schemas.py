from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta

# Channel schemas
class ChannelBase(BaseModel):
    id: str
    title: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelResponse(ChannelBase):
    last_updated: datetime
    
    class Config:
        from_attributes = True

# Video schemas
class VideoBase(BaseModel):
    id: str
    channel_id: str
    title: str
    description: Optional[str] = None
    published_at: datetime
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None

class VideoCreate(VideoBase):
    pass

class VideoResponse(VideoBase):
    is_downloaded: bool = False
    downloaded_at: Optional[datetime] = None
    downloaded_resolution: Optional[str] = None
    download_progress: float = 0.0
    
    class Config:
        from_attributes = True

# User settings schemas
class UserSettingsBase(BaseModel):
    download_directory: str = "downloads"
    default_resolution: str = "720p"
    max_concurrent_downloads: int = 2
    auto_update_interval: int = 24  # Hours

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettingsResponse(UserSettingsBase):
    id: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# Time frame schema
class TimeFrameRequest(BaseModel):
    start_date: datetime
    end_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Download request schema
class DownloadRequest(BaseModel):
    video_id: str
    resolution: str = "720p"

# Fetch videos request schema
class FetchVideosRequest(BaseModel):
    channel_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    days: Optional[int] = None
    fetch_all_channels: bool = False
    
    @validator('channel_id')
    def validate_channel_id(cls, v, values):
        # If fetch_all_channels is False and channel_id is None or empty, raise an error
        if 'fetch_all_channels' in values and not values['fetch_all_channels'] and (v is None or v == ''):
            raise ValueError('channel_id is required when fetch_all_channels is False')
        return v 