from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, desc, func
from datetime import datetime
from typing import List, Optional, Dict, Any, Union

from app.models.models import Channel, Video, UserSettings
from app.schemas.schemas import VideoCreate, ChannelCreate, UserSettingsUpdate

class DatabaseService:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # Channel operations
    async def get_channels(self) -> List[Channel]:
        """Get all channels"""
        result = await self.session.execute(select(Channel))
        return result.scalars().all()
    
    async def get_channel(self, channel_id: str) -> Optional[Channel]:
        """Get a channel by ID"""
        result = await self.session.execute(select(Channel).where(Channel.id == channel_id))
        return result.scalars().first()
    
    async def create_channel(self, channel_data: ChannelCreate) -> Channel:
        """Create a new channel"""
        channel = Channel(**channel_data.dict())
        self.session.add(channel)
        await self.session.commit()
        await self.session.refresh(channel)
        return channel
    
    async def update_channel(self, channel_id: str, channel_data: Dict[str, Any]) -> Optional[Channel]:
        """Update a channel"""
        channel = await self.get_channel(channel_id)
        if not channel:
            return None
        
        channel_data["last_updated"] = datetime.utcnow()
        await self.session.execute(
            update(Channel)
            .where(Channel.id == channel_id)
            .values(**channel_data)
        )
        await self.session.commit()
        return await self.get_channel(channel_id)
    
    async def delete_channel(self, channel_id: str) -> bool:
        """Delete a channel"""
        await self.session.execute(delete(Channel).where(Channel.id == channel_id))
        await self.session.commit()
        return True
    
    # Video operations
    async def get_videos(
        self, 
        channel_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_downloaded: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Video]:
        """Get videos with optional filters"""
        query = select(Video).order_by(desc(Video.published_at)).offset(offset).limit(limit)
        
        if channel_id:
            query = query.where(Video.channel_id == channel_id)
        
        if is_downloaded is not None:
            query = query.where(Video.is_downloaded == is_downloaded)
            
            # If we're filtering downloaded videos, filter by downloaded_at date
            if is_downloaded is True:
                if start_date:
                    query = query.where(Video.downloaded_at >= start_date)
                
                if end_date:
                    query = query.where(Video.downloaded_at <= end_date)
            else:
                # For non-downloaded videos, filter by published_at date
                if start_date:
                    query = query.where(Video.published_at >= start_date)
                
                if end_date:
                    query = query.where(Video.published_at <= end_date)
        else:
            # No downloaded filter, use published_at date for filtering
            if start_date:
                query = query.where(Video.published_at >= start_date)
            
            if end_date:
                query = query.where(Video.published_at <= end_date)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_videos_count(
        self, 
        channel_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_downloaded: Optional[bool] = None
    ) -> int:
        """Get count of videos with optional filters"""
        query = select(func.count()).select_from(Video)
        
        if channel_id:
            query = query.where(Video.channel_id == channel_id)
        
        if is_downloaded is not None:
            query = query.where(Video.is_downloaded == is_downloaded)
            
            # If we're filtering downloaded videos, filter by downloaded_at date
            if is_downloaded is True:
                if start_date:
                    query = query.where(Video.downloaded_at >= start_date)
                
                if end_date:
                    query = query.where(Video.downloaded_at <= end_date)
            else:
                # For non-downloaded videos, filter by published_at date
                if start_date:
                    query = query.where(Video.published_at >= start_date)
                
                if end_date:
                    query = query.where(Video.published_at <= end_date)
        else:
            # No downloaded filter, use published_at date for filtering
            if start_date:
                query = query.where(Video.published_at >= start_date)
            
            if end_date:
                query = query.where(Video.published_at <= end_date)
        
        result = await self.session.execute(query)
        return result.scalar()
    
    async def get_video(self, video_id: str) -> Optional[Video]:
        """Get a video by ID"""
        result = await self.session.execute(select(Video).where(Video.id == video_id))
        return result.scalars().first()
    
    async def get_video_by_id(self, video_id: str) -> Optional[Video]:
        """Alias for get_video"""
        return await self.get_video(video_id)
    
    async def get_videos_by_ids(self, video_ids: List[str]) -> List[Video]:
        """Get multiple videos by their IDs in a single query"""
        if not video_ids:
            return []
        
        result = await self.session.execute(
            select(Video).where(Video.id.in_(video_ids))
        )
        return result.scalars().all()
    
    async def create_videos_batch(self, videos_data: List[Dict[str, Any]]) -> List[Video]:
        """Create multiple videos in a single transaction"""
        if not videos_data:
            return []
        
        videos = [Video(**data) for data in videos_data]
        self.session.add_all(videos)
        await self.session.commit()
        
        # Refresh all videos to get their database state
        for video in videos:
            await self.session.refresh(video)
        
        return videos
    
    async def update_videos_batch(self, videos_data: Dict[str, Dict[str, Any]]) -> List[Video]:
        """Update multiple videos in a single transaction"""
        if not videos_data:
            return []
        
        updated_videos = []
        for video_id, data in videos_data.items():
            await self.session.execute(
                update(Video)
                .where(Video.id == video_id)
                .values(**data)
            )
            updated_videos.append(video_id)
        
        await self.session.commit()
        
        # Get all updated videos
        if updated_videos:
            result = await self.session.execute(
                select(Video).where(Video.id.in_(updated_videos))
            )
            return result.scalars().all()
        
        return []
    
    async def create_video(self, video_data: Union[VideoCreate, Dict[str, Any]]) -> Video:
        """Create a new video"""
        if isinstance(video_data, VideoCreate):
            video = Video(**video_data.dict())
        else:
            video = Video(**video_data)
        self.session.add(video)
        await self.session.commit()
        await self.session.refresh(video)
        return video
    
    async def update_video(self, video_id: str, video_data: Dict[str, Any]) -> Optional[Video]:
        """Update a video"""
        video = await self.get_video(video_id)
        if not video:
            return None
        
        await self.session.execute(
            update(Video)
            .where(Video.id == video_id)
            .values(**video_data)
        )
        await self.session.commit()
        return await self.get_video(video_id)
    
    async def delete_video(self, video_id: str) -> bool:
        """Delete a video"""
        await self.session.execute(delete(Video).where(Video.id == video_id))
        await self.session.commit()
        return True
    
    # User settings operations
    async def get_user_settings(self) -> Optional[UserSettings]:
        """Get user settings (there should be only one record)"""
        result = await self.session.execute(select(UserSettings))
        return result.scalars().first()
    
    async def create_or_update_user_settings(self, settings_data: UserSettingsUpdate) -> UserSettings:
        """Create or update user settings"""
        settings = await self.get_user_settings()
        
        if settings:
            # Update existing settings
            settings_dict = settings_data.dict()
            settings_dict["last_updated"] = datetime.utcnow()
            
            await self.session.execute(
                update(UserSettings)
                .where(UserSettings.id == settings.id)
                .values(**settings_dict)
            )
            await self.session.commit()
            return await self.get_user_settings()
        else:
            # Create new settings
            settings = UserSettings(**settings_data.dict())
            self.session.add(settings)
            await self.session.commit()
            await self.session.refresh(settings)
            return settings 