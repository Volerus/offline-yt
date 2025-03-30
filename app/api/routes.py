from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import BackgroundTasks
import logging
from sqlalchemy import inspect
from pathlib import Path
from fastapi.responses import FileResponse, StreamingResponse
import os
import io
import re

from app.database.setup import get_session
from app.services.database import DatabaseService
from app.services.youtube import YouTubeService
from app.schemas.schemas import (
    ChannelResponse, ChannelCreate,
    VideoResponse, VideoCreate, 
    UserSettingsResponse, UserSettingsUpdate,
    TimeFrameRequest, DownloadRequest,
    FetchVideosRequest
)

router = APIRouter()

# Initialize YouTube service and logger
youtube_service = YouTubeService()
logger = logging.getLogger(__name__)

# Dependency functions
def get_youtube_service():
    return youtube_service

def get_database_service(session: AsyncSession = Depends(get_session)):
    return DatabaseService(session)

# Channel endpoints
@router.get("/channels", response_model=List[ChannelResponse])
async def get_channels(session: AsyncSession = Depends(get_session)):
    """Get all subscribed channels"""
    db = DatabaseService(session)
    return await db.get_channels()

@router.post("/channels", response_model=ChannelResponse)
async def create_channel(
    channel: ChannelCreate,
    session: AsyncSession = Depends(get_session)
):
    """Add a new channel subscription"""
    db = DatabaseService(session)
    
    # Check if channel already exists - this is a fast DB lookup
    existing = await db.get_channel(channel.id)
    if existing:
        return existing
    
    # If channel info already includes title and other metadata, use it directly
    if channel.title and channel.thumbnail_url:
        # Skip YouTube API call completely if we already have the data
        return await db.create_channel(channel)
    
    # Fetch minimal channel info required - optimized version
    channel_info = await youtube_service.get_channel_info(channel.id)
    if not channel_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Channel with ID {channel.id} not found on YouTube"
        )
    
    # Create channel with minimal required info
    return await db.create_channel(ChannelCreate(**channel_info))

@router.get("/channels/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get a specific channel by ID"""
    db = DatabaseService(session)
    channel = await db.get_channel(channel_id)
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Channel with ID {channel_id} not found"
        )
    
    return channel

@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Delete a channel subscription"""
    db = DatabaseService(session)
    channel = await db.get_channel(channel_id)
    
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Channel with ID {channel_id} not found"
        )
    
    await db.delete_channel(channel_id)
    return {"message": f"Channel {channel_id} deleted"}

# Video endpoints
@router.get("/videos")
async def get_videos(
    channel_id: Optional[str] = None,
    days: Optional[int] = None, 
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    published_after: Optional[datetime] = None,
    is_downloaded: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session)
):
    """Get videos with optional filters"""
    # Process date parameters
    if days and not start_date:
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()
    
    # If published_after is provided, use it to set start_date
    if published_after and not start_date:
        start_date = published_after
    
    # Convert string 'true'/'false' to boolean
    is_downloaded_bool = None
    if is_downloaded is not None:
        if is_downloaded.lower() == 'true':
            is_downloaded_bool = True
        elif is_downloaded.lower() == 'false':
            is_downloaded_bool = False
    
    # Log parameters for debugging
    logger.info(f"Getting videos with filters - channel_id: {channel_id}, start_date: {start_date}, end_date: {end_date}, is_downloaded: {is_downloaded_bool}, limit: {limit}, offset: {offset}")
    
    db = DatabaseService(session)
    videos = await db.get_videos(
        channel_id=channel_id,
        start_date=start_date,
        end_date=end_date,
        is_downloaded=is_downloaded_bool,
        limit=limit,
        offset=offset
    )
    
    # Get total count of videos with the same filters but without limit/offset
    total_count = await db.get_videos_count(
        channel_id=channel_id,
        start_date=start_date,
        end_date=end_date,
        is_downloaded=is_downloaded_bool
    )
    
    return {
        "videos": videos,
        "total": total_count
    }

@router.post("/videos/fetch")
async def fetch_videos(
    request: FetchVideosRequest,
    background_tasks: BackgroundTasks,
    youtube_service: YouTubeService = Depends(get_youtube_service),
    db_service: DatabaseService = Depends(get_database_service)
):
    """Fetch videos from a channel with date filtering applied at the source"""
    try:
        # Start timing the operation
        start_time = datetime.now()
        
        # Log the request parameters (minimal logging)
        logger.info(f"Fetching videos for channel: {request.channel_id} with date range: {request.start_date} to {request.end_date}")
        
        # Ensure dates are properly formatted
        start_date = request.start_date
        end_date = request.end_date
        
        # If days parameter is provided, calculate the date range
        if request.days and not start_date:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=request.days)
            logger.info(f"Using calculated date range: {start_date} to {end_date} from days={request.days}")
        
        # Log the final date parameters
        logger.info(f"Final date parameters - start_date: {start_date}, end_date: {end_date}")
        
        # Fetch videos from YouTube (with date filtering done by yt-dlp)
        videos = await youtube_service.get_channel_videos(
            channel_id=request.channel_id,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"Found {len(videos)} videos from channel {request.channel_id}")
        
        # If no videos found, return empty list early
        if not videos:
            logger.info(f"No videos found for channel {request.channel_id} in the specified date range")
            return []
        
        # Prepare bulk operations - gather videos for insert/update
        videos_to_create = []
        videos_to_update = {}
        video_ids = [v['id'] for v in videos]
        
        # Get all existing videos in a single database query
        existing_videos = await db_service.get_videos_by_ids(video_ids)
        existing_video_ids = {v.id for v in existing_videos}
        
        # Process all videos at once
        for video in videos:
            if video['id'] in existing_video_ids:
                # Mark for update
                videos_to_update[video['id']] = {
                    'title': video['title'],
                    'description': video['description'],
                    'thumbnail_url': video['thumbnail_url'],
                    'duration': video['duration'],
                    'view_count': video['view_count'],
                    'like_count': video.get('like_count', 0),
                    'published_at': video['published_at'],
                }
            else:
                # Mark for creation
                videos_to_create.append({
                    'id': video['id'],
                    'channel_id': request.channel_id,
                    'title': video['title'],
                    'description': video['description'],
                    'published_at': video['published_at'],
                    'thumbnail_url': video['thumbnail_url'],
                    'duration': video['duration'],
                    'view_count': video['view_count'],
                    'like_count': video.get('like_count', 0),
                    'is_downloaded': False,
                })
        
        # Execute bulk operations
        created_videos = await db_service.create_videos_batch(videos_to_create)
        updated_videos = await db_service.update_videos_batch(videos_to_update)
        
        # Calculate and log timing information
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Video fetch completed in {elapsed:.2f}s - Created: {len(created_videos)}, Updated: {len(updated_videos)}")
        
        # Return all processed videos
        return created_videos + updated_videos
    except Exception as e:
        # Log the error and return it in a structured way
        logger.error(f"Error in fetch_videos endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to fetch videos",
                "message": str(e),
                "channel_id": request.channel_id
            }
        )

@router.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get a specific video by ID"""
    db = DatabaseService(session)
    video = await db.get_video(video_id)
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with ID {video_id} not found"
        )
    
    return video

@router.post("/videos/download")
async def download_video(
    download_request: DownloadRequest,
    session: AsyncSession = Depends(get_session)
):
    """Download a video"""
    try:
        db = DatabaseService(session)
        
        # Check if video exists
        video = await db.get_video(download_request.video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video with ID {download_request.video_id} not found"
            )
        
        # Log download attempt
        logger.info(f"Processing download request for video {download_request.video_id} at resolution {download_request.resolution}")
        
        # Check if download directory exists and is writable
        try:
            download_dir = Path(youtube_service.download_dir)
            if not download_dir.exists():
                download_dir.mkdir(parents=True)
            
            # Test file write permission
            test_file = download_dir / ".write_test"
            test_file.touch()
            test_file.unlink()
        except Exception as e:
            logger.error(f"Download directory issue: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error with download directory: {str(e)}"
            )
        
        # Start download and get detailed result
        result = await youtube_service.download_video(download_request)
        
        if result["success"]:
            # Update video download status
            await db.update_video(
                download_request.video_id,
                {
                    "is_downloaded": True,
                    "downloaded_at": datetime.utcnow(),
                    "downloaded_resolution": download_request.resolution,
                    "download_progress": 1.0,
                }
            )
            
            return {"message": result["message"]}
        else:
            # Handle specific error types
            error_type = result.get("error_type", "unknown")
            error_message = result.get("message", "Unknown error")
            
            logger.error(f"Failed to download video {download_request.video_id}: {error_message}")
            
            if error_type == "auth_required":
                # Special handling for authentication errors
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "message": "YouTube requires authentication to download this video.",
                        "solution": "Please set up a cookies.txt file with your YouTube credentials.",
                        "additional_info": "YouTube may be limiting download access to this video. You can also try installing PhantomJS to workaround some limitations."
                    }
                )
            elif error_type == "html_response":
                # HTML page received instead of video
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "YouTube returned an HTML page instead of a video.",
                        "solution": "This usually happens when authentication is required or there's an issue with the video.",
                        "additional_info": "Try setting up a cookies.txt file with YouTube login credentials.",
                        "check_endpoint": "/api/troubleshooting/downloads"
                    }
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_message
                )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors 
        logger.error(f"Unexpected error in download_video endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.get("/videos/{video_id}/progress")
async def get_download_progress(
    video_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get download progress for a video"""
    # Check active downloads first
    progress = youtube_service.get_download_progress(video_id)
    
    # If not in active downloads, check database
    if progress == 0.0:
        db = DatabaseService(session)
        video = await db.get_video(video_id)
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video with ID {video_id} not found"
            )
        
        if video.is_downloaded:
            progress = 1.0
        else:
            progress = video.download_progress
    
    return {"video_id": video_id, "progress": progress}

@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Delete a video from the database and remove its downloaded files from disk"""
    try:
        db = DatabaseService(session)
        
        # Check if video exists
        video = await db.get_video(video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video with ID {video_id} not found"
            )
        
        # If the video is downloaded, delete the files from disk
        if video.is_downloaded:
            # Get the video directory path
            video_dir = Path(youtube_service.download_dir) / video_id
            
            # Check if directory exists
            if video_dir.exists() and video_dir.is_dir():
                # Remove all files in the directory
                for file_path in video_dir.iterdir():
                    try:
                        if file_path.is_file():
                            file_path.unlink()
                        elif file_path.is_dir():
                            # Use shutil.rmtree for directories
                            import shutil
                            shutil.rmtree(file_path)
                    except Exception as e:
                        logger.error(f"Error deleting file {file_path}: {str(e)}")
                
                # Remove the directory itself
                try:
                    video_dir.rmdir()
                except Exception as e:
                    logger.error(f"Error removing directory {video_dir}: {str(e)}")
        
        # Delete the video from the database
        await db.delete_video(video_id)
        
        return {"message": f"Video {video_id} and associated files deleted successfully"}
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error in delete_video endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.get("/downloads/{video_id}")
async def serve_video(
    video_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Serve a downloaded video file with proper support for HTTP range requests"""
    try:
        db = DatabaseService(session)
        
        # Check if video exists and is downloaded
        video = await db.get_video(video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video with ID {video_id} not found"
            )
        
        if not video.is_downloaded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video {video_id} has not been downloaded yet"
            )
        
        # Find the video file in the directory
        video_dir = Path(youtube_service.download_dir) / video_id
        
        if not video_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video directory not found for {video_id}"
            )
        
        # Find the first video file in the directory
        video_files = list(video_dir.glob('*.mp4')) + list(video_dir.glob('*.webm'))
        
        if not video_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No video files found for {video_id}"
            )
        
        # Get the first video file found
        video_path = str(video_files[0])
        
        # Get file size for range requests
        file_size = os.path.getsize(video_path)
        
        # Support for range requests
        range_header = request.headers.get("range")
        
        # Log range header for debugging
        logger.info(f"Range header: {range_header}")
        
        headers = {
            "accept-ranges": "bytes",
            "content-disposition": f'attachment; filename="{video.title}.mp4"',
            "content-type": "video/mp4",
        }
        
        if range_header:
            # Parse range header
            range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                start_range = int(range_match.group(1))
                end_range = int(range_match.group(2)) if range_match.group(2) else file_size - 1
                
                # Ensure end doesn't exceed file size
                end_range = min(end_range, file_size - 1)
                
                # Calculate content length
                content_length = end_range - start_range + 1
                
                # Set content range header
                headers["content-range"] = f"bytes {start_range}-{end_range}/{file_size}"
                headers["content-length"] = str(content_length)
                
                # Create proper async generator for streaming
                async def file_streaming_generator():
                    with open(video_path, mode="rb") as f:
                        f.seek(start_range)
                        data = f.read(content_length)
                        yield data
                
                # Return partial content
                return StreamingResponse(
                    file_streaming_generator(),
                    status_code=206,
                    headers=headers
                )
        
        # If no range header or invalid range, return full file
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=f"{video.title}.mp4",
            headers=headers
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error in serve_video endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

# Settings endpoints
@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    """Get user settings"""
    db = DatabaseService(session)
    settings = await db.get_user_settings()
    
    if not settings:
        # Create default settings
        settings = await db.create_or_update_user_settings(UserSettingsUpdate())
    
    return settings

@router.put("/settings", response_model=UserSettingsResponse)
async def update_settings(
    settings: UserSettingsUpdate,
    session: AsyncSession = Depends(get_session)
):
    """Update user settings"""
    db = DatabaseService(session)
    return await db.create_or_update_user_settings(settings)

# Database inspection endpoint
@router.get("/db")
async def view_database(session: AsyncSession = Depends(get_session)):
    """View all database tables and their contents"""
    db = DatabaseService(session)
    
    # Get all channels
    channels = await db.get_channels()
    
    # Get all videos
    videos = await db.get_videos(limit=1000)  # Increased limit to show more videos
    
    # Get user settings
    settings = await db.get_user_settings()
    
    return {
        "tables": {
            "channels": [
                {
                    "id": channel.id,
                    "title": channel.title,
                    "thumbnail_url": channel.thumbnail_url,
                    "description": channel.description,
                    "last_updated": channel.last_updated
                } 
                for channel in channels
            ],
            "videos": [
                {
                    "id": video.id,
                    "channel_id": video.channel_id,
                    "title": video.title,
                    "published_at": video.published_at,
                    "thumbnail_url": video.thumbnail_url,
                    "duration": video.duration,
                    "view_count": video.view_count,
                    "like_count": video.like_count,
                    "is_downloaded": video.is_downloaded,
                    "downloaded_at": video.downloaded_at,
                    "downloaded_resolution": video.downloaded_resolution,
                    "download_progress": video.download_progress
                }
                for video in videos
            ],
            "user_settings": {} if not settings else {
                "id": settings.id,
                "download_directory": settings.download_directory,
                "default_resolution": settings.default_resolution,
                "max_concurrent_downloads": settings.max_concurrent_downloads,
                "auto_update_interval": settings.auto_update_interval,
                "last_updated": settings.last_updated
            }
        }
    }

@router.get("/auth/status")
async def check_auth_status():
    """Check the status of YouTube authentication"""
    cookies_path = Path('cookies.txt')
    has_cookies = cookies_path.exists() and cookies_path.stat().st_size > 0
    
    if not has_cookies:
        return {
            "authenticated": False,
            "message": "No YouTube authentication found. Create a cookies.txt file with your YouTube credentials.",
            "setup_instructions": [
                "1. Install a browser extension like 'Get cookies.txt' or 'EditThisCookie'",
                "2. Log in to YouTube in your browser",
                "3. Use the extension to export cookies for youtube.com to cookies.txt",
                "4. Place the cookies.txt file in the root directory of this application",
                "5. Restart the application"
            ]
        }
    
    # Check cookie file age
    cookie_age_days = (datetime.now() - datetime.fromtimestamp(cookies_path.stat().st_mtime)).days
    return {
        "authenticated": True,
        "message": "YouTube authentication file found",
        "cookie_age_days": cookie_age_days,
        "warning": "Your cookies are more than 30 days old. Consider refreshing them." if cookie_age_days > 30 else None
    }

@router.get("/troubleshooting/downloads")
async def download_troubleshooting():
    """Get troubleshooting information for video download issues"""
    cookies_path = Path('cookies.txt')
    has_cookies = cookies_path.exists() and cookies_path.stat().st_size > 0
    
    # Check for ffmpeg installation
    ffmpeg_installed = False
    try:
        import subprocess
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
        ffmpeg_installed = result.returncode == 0
    except:
        pass
    
    troubleshooting = {
        "common_issues": [
            {
                "issue": "403 Forbidden errors",
                "possible_causes": [
                    "YouTube is blocking automated downloads",
                    "The video requires authentication",
                    "Geographic restrictions apply to the video"
                ],
                "solutions": [
                    "Set up a cookies.txt file with your YouTube credentials",
                    "Try using a different video resolution",
                    "Make sure ffmpeg is installed for proper post-processing",
                    "Try using a VPN if the video is region-restricted"
                ]
            },
            {
                "issue": "Sign in to confirm you're not a bot",
                "possible_causes": [
                    "YouTube's anti-bot mechanisms are detecting the downloader"
                ],
                "solutions": [
                    "Set up a cookies.txt file with valid YouTube login credentials",
                    "Reduce the frequency of download requests",
                    "Update your cookies.txt file if it's more than a few days old"
                ]
            },
            {
                "issue": "HTML files downloaded instead of videos",
                "possible_causes": [
                    "YouTube is returning an error page instead of the video",
                    "Authentication required",
                    "Video is restricted or removed"
                ],
                "solutions": [
                    "Ensure you have a valid cookies.txt file",
                    "Check if the video is still available on YouTube directly",
                    "Try a different video to rule out specific video issues"
                ]
            }
        ],
        "authentication_status": {
            "cookies_file_exists": has_cookies,
            "cookies_path": str(cookies_path),
            "setup_instructions": [
                "1. Install a browser extension like 'Get cookies.txt' or 'EditThisCookie'",
                "2. Log in to YouTube in your browser",
                "3. Use the extension to export cookies for youtube.com to cookies.txt",
                "4. Place the cookies.txt file in the root directory of this application",
                "5. Restart the application"
            ] if not has_cookies else []
        },
        "ffmpeg_status": {
            "installed": ffmpeg_installed,
            "installation_instructions": [
                "Install ffmpeg using your package manager:",
                "macOS: brew install ffmpeg",
                "Ubuntu/Debian: sudo apt install ffmpeg",
                "Windows: Download from https://ffmpeg.org/download.html",
                "After installation, restart the application"
            ] if not ffmpeg_installed else []
        },
        "alternative_methods": [
            "Try a lower resolution (e.g. 720p instead of 1080p)",
            "Make sure your cookies are fresh (logged in recently to YouTube)",
            "Some videos may have download restrictions - not all videos can be downloaded"
        ]
    }
    
    return troubleshooting

@router.post("/auth/cookies")
async def upload_cookies_file(file: UploadFile = File(...)):
    """Upload a cookies.txt file for YouTube authentication"""
    try:
        # Validate file is a text file
        if not file.content_type or "text" not in file.content_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a text file"
            )

        # Save the uploaded file as cookies.txt in the root directory
        content = await file.read()
        
        # Basic validation of cookie file format
        if len(content) < 10 or b"youtube.com" not in content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cookie file format. File must contain YouTube cookies."
            )
        
        # Write the file
        with open("cookies.txt", "wb") as f:
            f.write(content)
        
        # Return success
        return {
            "success": True,
            "message": "Cookie file uploaded successfully",
            "file_size": len(content)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading cookies file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload cookie file: {str(e)}"
        ) 