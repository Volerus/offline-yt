import yt_dlp
import os
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import json

from app.models.models import Video, Channel
from app.schemas.schemas import DownloadRequest

logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self, download_dir: str = "downloads"):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(exist_ok=True)
        
        # Base yt-dlp options
        self.ydl_opts = {
            'quiet': False,  # Changed to False to see more output
            'no_warnings': False,  # Changed to False to see warnings
            'ignoreerrors': True,
            'extract_flat': False,  # We need full info to get thumbnails
            'skip_download': True,
            # Add cookies file if available
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
        }
        
        # Active downloads dict to track progress
        self.active_downloads = {}
    
    def _get_best_thumbnail(self, entry):
        """Get the best thumbnail URL from a video entry."""
        try:
            # First and most reliable method: construct thumbnail URL directly from video ID
            video_id = entry.get('id', '')
            if video_id:
                # YouTube thumbnail URLs follow a predictable pattern
                # MaxRes thumbnail (the highest quality)
                return f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                
        except Exception as e:
            logger.error(f"Error constructing thumbnail URL: {str(e)}")
        
        # Fallback to empty string if all methods fail
        return ""
    
    async def get_channel_videos(self, channel_id, start_date=None, end_date=None):
        """
        Fetches videos from a specified channel within a date range.
        """
        videos = []
        
        # Create the URL with the channel ID
        url = f"https://www.youtube.com/channel/{channel_id}/videos"
        logger.info(f"Fetching videos from URL: {url}")
        
        try:
            # Configure yt-dlp options with optimizations for faster extraction
            video_opts = {
                **self.ydl_opts,
                'extract_flat': False,  # Need full extraction to get accurate metadata
                'ignoreerrors': True,
                'quiet': True,         # Reduce console output for performance
                'playlistend': 30,     # Limit to 30 videos to avoid long processing times
                'break_on_reject': True,  # Stop processing when videos outside date range are found
            }
            
            # Extract info using yt-dlp in a thread pool since it's blocking
            loop = asyncio.get_event_loop()
            
            def extract_info():
                # Build command options for yt-dlp
                cmd = ["yt-dlp", "--dump-json", "--no-download", "--ignore-no-formats-error", "--no-warnings"]
                
                # Add date filtering options
                if start_date:
                    start_date_str = start_date.strftime('%Y%m%d')
                    cmd.extend(["--dateafter", start_date_str])
                    logger.info(f"Filtering videos uploaded after {start_date_str}")
                
                if end_date:
                    end_date_str = end_date.strftime('%Y%m%d')
                    cmd.extend(["--datebefore", end_date_str])
                    logger.info(f"Filtering videos uploaded before {end_date_str}")
                
                cmd.extend(["--break-on-reject", url])
                
                logger.info(f"Running command: {' '.join(cmd)}")
                
                # Run yt-dlp as subprocess and capture JSON output
                import subprocess
                import json
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                # Each line is a JSON object for a video
                entries = []
                for line in result.stdout.splitlines():
                    if line.strip():
                        try:
                            entries.append(json.loads(line))
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse JSON line: {line[:100]}...")
                
                return {"entries": entries}
            
            info = await loop.run_in_executor(None, extract_info)
            
            # Check if info is None or entries is empty/None
            if not info:
                logger.error(f"No information returned for channel {channel_id}")
                return []
                
            entries = info.get('entries', [])
            if not entries:
                logger.info(f"No videos found for channel {channel_id}")
                return []
            
            # Filter out None entries (unavailable videos)
            entries = [entry for entry in entries if entry is not None]
            
            logger.info(f"Found {len(entries)} videos from channel {channel_id}")
            
            # Process all entries and convert to our video format
            for entry in entries:
                try:
                    video_id = entry.get('id')
                    if not video_id:
                        logger.warning("Skipping video entry without ID")
                        continue
                    
                    # Get the published date from various possible fields
                    published_at = None
                    upload_date = entry.get('upload_date', '')
                    
                    # Try timestamp first (most accurate)
                    if 'timestamp' in entry and entry['timestamp']:
                        published_at = datetime.fromtimestamp(entry['timestamp'], tz=timezone.utc)
                    # Try upload_date (format: YYYYMMDD)
                    elif upload_date and len(upload_date) == 8:
                        try:
                            year = int(upload_date[:4])
                            month = int(upload_date[4:6])
                            day = int(upload_date[6:8])
                            published_at = datetime(year, month, day, tzinfo=timezone.utc)
                        except ValueError:
                            published_at = None
                    
                    # If no date found, use current time (shouldn't happen)
                    if not published_at:
                        published_at = datetime.now(timezone.utc)
                    
                    # Create video object with available data
                    thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                    
                    video = {
                        'id': video_id,
                        'title': entry.get('title', 'Untitled Video'),
                        'description': entry.get('description', ''),
                        'published_at': published_at,
                        'thumbnail_url': thumbnail_url,
                        'duration': entry.get('duration', 0),
                        'view_count': entry.get('view_count', 0),
                        'like_count': entry.get('like_count', 0),
                    }
                    videos.append(video)
                except Exception as e:
                    logger.error(f"Error processing video entry: {str(e)}")
                    continue
            
            logger.info(f"After processing: {len(videos)} videos ready for database")
            return videos
        
        except Exception as e:
            logger.error(f"Error fetching videos from channel {channel_id}: {str(e)}")
            return []
    
    async def get_channel_info(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get channel information"""
        try:
            loop = asyncio.get_event_loop()
            
            # Determine URL format based on channel_id
            if channel_id.startswith('@'):
                url = f"https://www.youtube.com/@{channel_id}"
            elif channel_id.startswith('UC'):
                url = f"https://www.youtube.com/channel/{channel_id}"
            else:
                url = f"https://www.youtube.com/c/{channel_id}"
            
            logger.info(f"Fetching channel info from: {url}")
            
            # Create optimized options for faster channel info extraction
            channel_opts = {
                **self.ydl_opts,
                'extract_flat': False,  # Need full info to extract channel details
                'playlistend': 1,      # Only need channel info, not all videos
                'skip_download': True,
                'quiet': True,         # Reduce console output
                'ignore_no_formats_error': True,
                'ignoreerrors': True,
                'no_warnings': True,
                'socket_timeout': 10,  # Add timeout to prevent hanging
                'extract_info': True,  # Ensure we extract all available info
                'writeinfojson': False, # Don't write info to a file
                'writedescription': False, # Don't write description to a file
                'writethumbnail': False, # Don't write thumbnail to a file
            }
            
            def extract_info():
                with yt_dlp.YoutubeDL(channel_opts) as ydl:
                    return ydl.extract_info(url, download=False)  # process=True to get full metadata
            
            info = await loop.run_in_executor(None, extract_info)
            
            if not info:
                return None
            
            # Debug: log important parts of the channel info structure
            self._log_channel_info_structure(info)
            
            # If the channel_id is a handle (@Username), get the actual YouTube channel ID
            actual_channel_id = info.get('channel_id', channel_id)
            
            # Get the thumbnail URL using our comprehensive extraction method
            thumbnail_url = self._extract_channel_thumbnail(info)
            
            # Last resort fallback if all extraction methods fail
            if not thumbnail_url and actual_channel_id.startswith('UC'):
                thumbnail_url = f"https://yt3.googleusercontent.com/channel/{actual_channel_id}"
                logger.info(f"Using last resort fallback thumbnail URL: {thumbnail_url}")
            
            logger.info(f"Channel info extracted for {channel_id}: title={info.get('title', 'Unknown')}, thumbnail_url={thumbnail_url}")
            
            channel_data = {
                'id': actual_channel_id,
                'title': info.get('title', 'Unknown Channel'),
                'description': info.get('description', ''),
                'thumbnail_url': thumbnail_url,
            }
            
            return channel_data
        
        except Exception as e:
            logger.error(f"Error fetching channel info for {channel_id}: {str(e)}")
            return None
    
    def _log_channel_info_structure(self, info):
        """Log important parts of the channel info structure for debugging."""
        try:
            # Create a simplified structure overview for logging
            structure = {
                "keys": list(info.keys()),
                "has_thumbnails": "thumbnails" in info,
                "has_thumbnail": "thumbnail" in info,
                "channel_id": info.get("channel_id", "Not found"),
                "uploader_id": info.get("uploader_id", "Not found"),
                "uploader": info.get("uploader", "Not found"),
            }
            
            # Extract thumbnail info if available
            if "thumbnails" in info and info["thumbnails"]:
                structure["thumbnails_count"] = len(info["thumbnails"])
                if len(info["thumbnails"]) > 0:
                    structure["first_thumbnail"] = info["thumbnails"][0]
            
            if "thumbnail" in info:
                structure["thumbnail_value"] = info["thumbnail"]
                
            # Add additional debugging for channel avatar-specific data
            if "channel" in info:
                structure["channel_keys"] = list(info["channel"].keys()) if isinstance(info["channel"], dict) else "Not a dict"
                if isinstance(info["channel"], dict) and "thumbnails" in info["channel"]:
                    structure["channel_thumbnails"] = info["channel"]["thumbnails"]
            
            logger.info(f"Channel info structure: {json.dumps(structure, indent=2)}")
        except Exception as e:
            logger.error(f"Error logging channel info structure: {str(e)}")
    
    def _extract_channel_thumbnail(self, info):
        """Extract channel thumbnail URL from various paths in the info structure."""
        thumbnail_url = ""
        
        try:
            # Method 1: Direct thumbnail field
            if "thumbnail" in info and info["thumbnail"]:
                thumbnail_url = info["thumbnail"]
                logger.info(f"Found thumbnail from direct thumbnail field: {thumbnail_url}")
                return thumbnail_url
                
            # Method 2: Thumbnails list in main object
            if "thumbnails" in info and isinstance(info["thumbnails"], list) and info["thumbnails"]:
                thumbnails = sorted(info["thumbnails"], 
                                   key=lambda x: x.get("height", 0) * x.get("width", 0) 
                                   if "height" in x and "width" in x else 0, 
                                   reverse=True)
                thumbnail_url = thumbnails[0].get("url", "")
                if thumbnail_url:
                    logger.info(f"Found thumbnail from thumbnails list: {thumbnail_url}")
                    return thumbnail_url
                    
            # Method 3: Check in channel sub-object
            if "channel" in info and isinstance(info["channel"], dict):
                channel_info = info["channel"]
                
                # Check for direct thumbnail
                if "thumbnail" in channel_info and channel_info["thumbnail"]:
                    thumbnail_url = channel_info["thumbnail"]
                    logger.info(f"Found thumbnail from channel.thumbnail: {thumbnail_url}")
                    return thumbnail_url
                    
                # Check for thumbnails list
                if "thumbnails" in channel_info and isinstance(channel_info["thumbnails"], list) and channel_info["thumbnails"]:
                    thumbnails = sorted(channel_info["thumbnails"], 
                                      key=lambda x: x.get("height", 0) * x.get("width", 0) 
                                      if "height" in x and "width" in x else 0, 
                                      reverse=True)
                    thumbnail_url = thumbnails[0].get("url", "")
                    if thumbnail_url:
                        logger.info(f"Found thumbnail from channel.thumbnails list: {thumbnail_url}")
                        return thumbnail_url
            
            # Method 4: Check for uploader_id based URL
            if "uploader_id" in info and info["uploader_id"]:
                uploader_id = info["uploader_id"]
                if uploader_id.startswith("UC"):
                    thumbnail_url = f"https://yt3.googleusercontent.com/channel/{uploader_id}"
                    logger.info(f"Created thumbnail URL from uploader_id: {thumbnail_url}")
                    return thumbnail_url
                    
            # Method 5: Use channel_id as fallback
            if "channel_id" in info and info["channel_id"] and info["channel_id"].startswith("UC"):
                channel_id = info["channel_id"]
                thumbnail_url = f"https://yt3.googleusercontent.com/channel/{channel_id}"
                logger.info(f"Created fallback thumbnail URL from channel_id: {thumbnail_url}")
                return thumbnail_url
                
            return ""
        except Exception as e:
            logger.error(f"Error in _extract_channel_thumbnail: {str(e)}")
            return ""
    
    async def download_video(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download a video at specified resolution. Returns result object with status and message."""
        video_id = request.video_id
        resolution = request.resolution
        
        try:
            # Create video-specific directory
            video_dir = self.download_dir / video_id
            video_dir.mkdir(exist_ok=True)
            
            # Set up progress callback
            progress_file = str(video_dir / "progress.txt")
            downloaded_files = []
            
            def progress_hook(d):
                try:
                    if d['status'] == 'downloading':
                        total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                        if total_bytes > 0:
                            downloaded = d.get('downloaded_bytes', 0)
                            progress = downloaded / total_bytes
                            self.active_downloads[video_id] = progress
                            
                            # Write progress to file
                            with open(progress_file, 'w') as f:
                                f.write(f"{progress:.2f}")
                
                    elif d['status'] == 'finished':
                        self.active_downloads[video_id] = 1.0
                        
                        # Track downloaded file
                        if 'filename' in d:
                            downloaded_files.append(d['filename'])
                        
                        # Write progress to file
                        with open(progress_file, 'w') as f:
                            f.write("1.0")
                except Exception as e:
                    # Log but don't crash the hook
                    logger.error(f"Error in progress hook: {str(e)}")
            
            # Log download attempt
            logger.info(f"Starting download for video {video_id} at resolution {resolution}")
            
            # Check for cookies file
            cookies_path = Path('cookies.txt')
            has_cookies = cookies_path.exists() and cookies_path.stat().st_size > 0
            
            # Determine format string based on resolution
            # Map common resolution labels to yt-dlp format strings
            resolution_map = {
                '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
                '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
                '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
                '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
                '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
                'best': 'bestvideo+bestaudio/best',
            }
            
            # Use the mapped format string if available, otherwise use the resolution directly
            format_str = resolution_map.get(resolution, resolution)
            
            download_opts = {
                'format': format_str,
                'outtmpl': str(video_dir / '%(title)s.%(ext)s'),
                'progress_hooks': [progress_hook],
                'quiet': False,
                'ignoreerrors': True,
                'no_color': True,
                'socket_timeout': 30,
                'retries': 10,
                'cookiefile': str(cookies_path) if has_cookies else None,
                'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'referer': 'https://www.youtube.com/',
                'geo_bypass': True,
                'geo_bypass_country': 'US',
                'extractor_retries': 5,
                'skip_download_archive': True,  # Don't use archive to always try fresh download
                'merge_output_format': 'mp4',   # Explicitly set merge format to mp4
                'postprocessors': [{            # Add post-processors to ensure merging
                    'key': 'FFmpegVideoConvertor',
                    'preferedformat': 'mp4',    # Convert to mp4 format
                }],
                'allow_unplayable_formats': True,  # Try to download even restricted formats
                'prefer_free_formats': False,  # Don't limit to free formats
                'youtube_include_dash_manifest': False,  # Skip DASH manifest
                'force_generic_extractor': False,  # Try multiple extractors
                'overwrites': True,  # Overwrite files if they exist
                'verbose': True,  # More output for debugging
            }
            
            # Initialize active download entry
            self.active_downloads[video_id] = 0.0
            
            # Download in a thread pool
            loop = asyncio.get_event_loop()
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            error_message = None
            auth_required = False
            
            # Create a subprocess executor for running yt-dlp
            async def run_download():
                nonlocal error_message, auth_required
                try:
                    # Get the proper format string from the resolution map
                    actual_format = resolution_map.get(resolution, 'bestvideo[height<=360]+bestaudio/best[height<=360]')
                    
                    # Check for ffmpeg existence
                    ffmpeg_path = "/usr/bin/ffmpeg"
                    ffmpeg_args = []
                    if os.path.exists(ffmpeg_path):
                        ffmpeg_args = ["--ffmpeg-location", ffmpeg_path]
                    else:
                        # Try to find ffmpeg in PATH
                        import shutil
                        ffmpeg_in_path = shutil.which("ffmpeg")
                        if ffmpeg_in_path:
                            ffmpeg_args = ["--ffmpeg-location", ffmpeg_in_path]
                        else:
                            logger.warning("ffmpeg not found, video merging may fail")
                    
                    # Use run_yt_dlp coroutine to run yt-dlp in a separate process
                    proc = await asyncio.create_subprocess_exec(
                        "yt-dlp",
                        url,
                        "--format", actual_format,
                        "--output", download_opts["outtmpl"],
                        "--no-continue",  # Don't resume downloads
                        "--force-overwrites",  # Force overwrite
                        "--no-playlist",  # Don't download playlists
                        *ffmpeg_args,  # Include ffmpeg location if found
                        "--merge-output-format", "mp4",  # Force merge to mp4
                        *(["--cookies", str(cookies_path)] if has_cookies else []),
                        "--geo-bypass",
                        "--verbose",
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    stdout, stderr = await proc.communicate()
                    stdout_str = stdout.decode('utf-8', errors='ignore')
                    stderr_str = stderr.decode('utf-8', errors='ignore')
                    
                    # Check for success
                    if proc.returncode != 0:
                        # Check for specific error conditions
                        if "Sign in to confirm your age" in stdout_str or "Sign in to confirm your age" in stderr_str:
                            auth_required = True
                            error_message = "Age verification required. Please sign in with a YouTube account."
                        elif "requested format not available" in stdout_str or "requested format not available" in stderr_str:
                            error_message = f"The requested format ({resolution}) is not available. Try a different resolution."
                        else:
                            error_message = f"yt-dlp failed with code {proc.returncode}. Check server logs for details."
                        
                        # Log full output for debugging
                        logger.error(f"yt-dlp failed for {video_id}. stdout: {stdout_str}, stderr: {stderr_str}")
                        return proc.returncode
                        
                    # Find all media files downloaded
                    media_files = list(video_dir.glob("*.mp4")) + list(video_dir.glob("*.webm")) + list(video_dir.glob("*.m4a"))
                    
                    # If there are separate audio and video files, merge them
                    video_files = list(video_dir.glob("*.mp4")) + list(video_dir.glob("*.webm"))
                    audio_files = list(video_dir.glob("*.m4a")) + list(video_dir.glob("*.mp3"))
                    
                    if len(video_files) > 0 and len(audio_files) > 0:
                        logger.info(f"Found separate audio and video files for {video_id}, merging them...")
                        
                        # Find files to merge (take first of each)
                        video_file = video_files[0]
                        audio_file = audio_files[0]
                        output_file = video_dir / f"{video_file.stem}_merged.mp4"
                        
                        # Use FFmpeg to merge files
                        merge_proc = await asyncio.create_subprocess_exec(
                            "ffmpeg",
                            "-i", str(video_file),
                            "-i", str(audio_file),
                            "-c:v", "copy",
                            "-c:a", "aac",
                            "-strict", "experimental",
                            str(output_file),
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                        merge_stdout, merge_stderr = await merge_proc.communicate()
                        
                        if merge_proc.returncode == 0:
                            logger.info(f"Successfully merged files for {video_id}")
                            
                            # Delete the original separate files
                            video_file.unlink(missing_ok=True)
                            audio_file.unlink(missing_ok=True)
                        else:
                            merge_stderr_str = merge_stderr.decode('utf-8', errors='ignore')
                            logger.error(f"Failed to merge files for {video_id}: {merge_stderr_str}")
                    
                    return proc.returncode
                    
                except Exception as e:
                    error_message = str(e)
                    logger.error(f"Error running yt-dlp for {video_id}: {error_message}")
                    return 1
            
            # Execute download
            download_result = await run_download()
            
            # Check result
            if download_result == 0:
                # Success
                self.active_downloads[video_id] = 1.0
                
                # Check if files were downloaded
                media_files = list(video_dir.glob("*.mp4")) + list(video_dir.glob("*.webm")) + list(video_dir.glob("*.m4a"))
                
                if not media_files:
                    logger.error(f"No media files found after download for {video_id}")
                    return {
                        "success": False,
                        "error_type": "no_files",
                        "message": "Download completed, but no media files were found."
                    }
                
                logger.info(f"Successfully downloaded video {video_id}")
                return {
                    "success": True,
                    "message": "Video downloaded successfully."
                }
            else:
                # Failure
                self.active_downloads.pop(video_id, None)
                
                if auth_required:
                    return {
                        "success": False,
                        "error_type": "auth_required",
                        "message": "YouTube requires authentication to download this video. Please set up a cookies.txt file with YouTube login credentials."
                    }
                else:
                    logger.error(f"yt-dlp returned non-zero exit code: {download_result}")
                    return {
                        "success": False,
                        "error_type": "download_failed",
                        "message": error_message or f"Failed to download video {video_id}"
                    }
            
            # Verify the downloaded files to make sure they're not HTML
            if downloaded_files:
                for file_path in downloaded_files:
                    # Check file extension and content
                    if file_path.endswith('.html') or file_path.endswith('.htm'):
                        logger.error(f"Downloaded HTML file instead of video: {file_path}")
                        
                        # Read the first few bytes to check for HTML content
                        try:
                            with open(file_path, 'rb') as f:
                                header = f.read(1024).decode('utf-8', errors='ignore').lower()
                                if '<html' in header or '<!doctype html' in header:
                                    # Delete the HTML file
                                    Path(file_path).unlink(missing_ok=True)
                                    
                                    return {
                                        "success": False,
                                        "error_type": "html_response",
                                        "message": "YouTube returned an HTML page instead of a video. This usually means authentication is required or there's an issue with the video."
                                    }
                        except Exception as e:
                            logger.error(f"Error checking file content: {str(e)}")
                            
            # Default error if we somehow got here
            return {
                "success": False,
                "error_type": "unknown",
                "message": "An unknown error occurred during download."
            }
            
        except Exception as e:
            # Log error and return failure
            logger.error(f"Error in download_video: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error_type": "exception",
                "message": f"Error: {str(e)}"
            }
    
    def get_download_progress(self, video_id: str) -> float:
        """Get the download progress for a specific video"""
        return self.active_downloads.get(video_id, 0.0)
        
    async def get_video_info(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific video by ID"""
        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            logger.info(f"Fetching video info for: {url}")
            
            loop = asyncio.get_event_loop()
            
            def extract_info():
                # Configure yt-dlp for minimal info extraction
                video_opts = {
                    **self.ydl_opts,
                    'quiet': True,
                    'skip_download': True,
                    'extract_flat': False,
                }
                
                try:
                    with yt_dlp.YoutubeDL(video_opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        return info
                except Exception as e:
                    logger.error(f"Error extracting video info: {str(e)}")
                    return None
            
            # Extract info in a thread pool
            info = await loop.run_in_executor(None, extract_info)
            
            if not info:
                logger.error(f"No information returned for video {video_id}")
                return None
            
            # Get the published date
            published_at = None
            upload_date = info.get('upload_date', '')
            
            # Try timestamp first (most accurate)
            if 'timestamp' in info and info['timestamp']:
                published_at = datetime.fromtimestamp(info['timestamp'], tz=timezone.utc)
            # Try upload_date (format: YYYYMMDD)
            elif upload_date and len(upload_date) == 8:
                try:
                    year = int(upload_date[:4])
                    month = int(upload_date[4:6])
                    day = int(upload_date[6:8])
                    published_at = datetime(year, month, day, tzinfo=timezone.utc)
                except ValueError:
                    published_at = None
            
            # If no date found, use current time
            if not published_at:
                published_at = datetime.now(timezone.utc)
            
            # Construct thumbnail URL
            thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            
            # Extract channel ID
            channel_id = info.get('channel_id', '')
            if not channel_id and 'uploader_id' in info:
                channel_id = info['uploader_id']
            
            # Create video info object
            video_info = {
                'id': video_id,
                'title': info.get('title', 'Untitled Video'),
                'description': info.get('description', ''),
                'published_at': published_at,
                'thumbnail_url': thumbnail_url,
                'duration': info.get('duration', 0),
                'view_count': info.get('view_count', 0),
                'like_count': info.get('like_count', 0),
                'channel_id': channel_id,
            }
            
            return video_info
            
        except Exception as e:
            logger.error(f"Error fetching video info for {video_id}: {str(e)}")
            return None
    
    async def get_user_subscriptions(self) -> List[Dict[str, Any]]:
        """
        Fetches user's YouTube subscriptions using cookies.txt for authentication.
        Returns a list of basic channel info (id and title only) for faster loading.
        """
        try:
            # Check if cookies file exists - required for getting subscriptions
            cookies_path = Path('cookies.txt')
            if not cookies_path.exists() or cookies_path.stat().st_size == 0:
                logger.error("No cookies.txt file found - required for fetching subscriptions")
                return []
            
            # OPTIMIZATION: Try direct method with faster extraction
            loop = asyncio.get_event_loop()
            
            def extract_subs_fast():
                import subprocess
                import json
                
                # Direct YouTube subscription list fast extraction
                # Print channel ID and name only - skips enrichment for speed
                logger.info("Fast subscription extraction: getting only channel ID and name")
                cmd = [
                    "yt-dlp",
                    "--flat-playlist",
                    "--print", "%(uploader)s %(channel_id)s %(uploader_id)s",
                    "--cookies", str(cookies_path),
                    "--no-warnings",
                    # Try both subscription list locations
                    "https://www.youtube.com/feed/channels",
                ]
                
                logger.info(f"Running optimized command: {' '.join(cmd)}")
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.warning(f"First extraction attempt failed: {result.stderr}")
                    # Try alternate URLs
                    cmd[-1] = ":ytsubs"
                    logger.info(f"Trying alternate URL: {cmd[-1]}")
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        cmd[-1] = "https://www.youtube.com/feed/subscriptions"
                        logger.info(f"Trying final URL: {cmd[-1]}")
                        result = subprocess.run(cmd, capture_output=True, text=True)
                        
                        if result.returncode != 0:
                            logger.error(f"All extraction attempts failed: {result.stderr}")
                            return []
                
                # Parse the output format: "Channel Name UC123456789012345678901234"
                channels = []
                channel_ids = set()
                
                for line in result.stdout.splitlines():
                    if not line.strip():
                        continue
                    
                    # Extract channel ID (either from channel_id or uploader_id)
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        # Last part is likely the ID
                        channel_id = None
                        title_parts = []
                        
                        # Look for UC IDs which are YouTube channel IDs
                        for part in parts:
                            if part.startswith("UC") and len(part) >= 20:
                                channel_id = part
                            else:
                                title_parts.append(part)
                        
                        # If we found a channel ID
                        if channel_id and channel_id not in channel_ids:
                            channel_ids.add(channel_id)
                            title = " ".join(title_parts) if title_parts else "Unknown Channel"
                            
                            channels.append({
                                "id": channel_id,
                                "title": title,
                                "thumbnail_url": f"https://yt3.googleusercontent.com/channel/{channel_id}",
                                "description": ""
                            })
                
                logger.info(f"Fast extraction found {len(channels)} subscribed channels")
                return channels
            
            # Try the fast extraction first
            channels = await loop.run_in_executor(None, extract_subs_fast)
            
            if channels:
                return channels
            
            # If that failed, try the fallback method with --skip=authcheck
            logger.info("Fast extraction failed, using fallback method")
            
            def extract_subs_fallback():
                import subprocess
                import json
                
                # Fallback to regular JSON extraction but with authcheck skipped
                cmd = [
                    "yt-dlp",
                    "--flat-playlist",
                    "--extractor-args", "youtubetab:skip=authcheck",
                    "--dump-json",
                    "--cookies", str(cookies_path),
                    "--no-warnings",
                    ":ytsubs"
                ]
                
                logger.info(f"Running fallback command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                channels = []
                channel_ids = set()
                
                if result.returncode != 0:
                    logger.error(f"Fallback extraction failed: {result.stderr}")
                    return []
                
                for line in result.stdout.splitlines():
                    if not line.strip():
                        continue
                    
                    try:
                        data = json.loads(line)
                        channel_id = data.get("channel_id") or data.get("uploader_id")
                        
                        if channel_id and channel_id.startswith("UC") and channel_id not in channel_ids:
                            channel_ids.add(channel_id)
                            channels.append({
                                "id": channel_id,
                                "title": data.get("channel") or data.get("uploader") or "Unknown Channel",
                                "thumbnail_url": f"https://yt3.googleusercontent.com/channel/{channel_id}",
                                "description": ""
                            })
                    except Exception as e:
                        continue
                
                return channels
            
            # Try the fallback method
            channels = await loop.run_in_executor(None, extract_subs_fallback)
            
            if not channels:
                logger.warning("All subscription extraction methods failed")
            
            return channels
            
        except Exception as e:
            logger.error(f"Error fetching subscriptions: {str(e)}")
            return []
    
    async def _get_subscriptions_using_ytsubs(self) -> List[Dict[str, Any]]:
        """
        Fetch YouTube subscriptions using the dedicated :ytsubs extractor.
        This is the most reliable method to get subscriptions.
        """
        try:
            cookies_path = Path('cookies.txt')
            if not cookies_path.exists():
                return []
            
            loop = asyncio.get_event_loop()
            
            def extract_subs():
                import subprocess
                import json
                
                # Command using the special :ytsubs extractor
                cmd = [
                    "yt-dlp",
                    "--flat-playlist",
                    "--skip-download", 
                    "--cookies", str(cookies_path),
                    "--dump-json",
                    "--no-warnings",
                    ":ytsubs"  # Special extractor for subscriptions
                ]
                
                logger.info(f"Running ytsubs command: {' '.join(cmd)}")
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                # Log stdout and stderr for debugging
                logger.debug(f"STDOUT: {result.stdout[:1000]}...")
                logger.debug(f"STDERR: {result.stderr}")
                
                if result.returncode != 0:
                    logger.error(f"Error using :ytsubs extractor: {result.stderr}")
                    return []
                
                # Parse each subscription channel from the output
                channels = []
                channel_ids = set()  # To avoid duplicates
                
                for line in result.stdout.splitlines():
                    if not line.strip():
                        continue
                    
                    try:
                        data = json.loads(line)
                        
                        # Extract channel info
                        channel_id = data.get("channel_id") or data.get("uploader_id")
                        if not channel_id or channel_id in channel_ids:
                            continue
                        
                        # Make sure it's a channel ID
                        if not channel_id.startswith("UC"):
                            continue
                        
                        channel_ids.add(channel_id)
                        
                        # Create channel entry
                        channel = {
                            "id": channel_id,
                            "title": data.get("channel") or data.get("uploader") or "Unknown Channel",
                            "thumbnail_url": data.get("thumbnail") or f"https://yt3.googleusercontent.com/channel/{channel_id}",
                            "description": ""
                        }
                        channels.append(channel)
                    
                    except json.JSONDecodeError:
                        continue
                    except Exception as e:
                        logger.warning(f"Error processing :ytsubs entry: {str(e)}")
                
                logger.info(f"Found {len(channels)} channels using :ytsubs")
                return channels
            
            # Run in thread pool
            subscriptions = await loop.run_in_executor(None, extract_subs)
            
            # If found subscriptions, enrich them with channel info
            if subscriptions:
                logger.info("Successfully retrieved subscriptions using :ytsubs extractor")
                
                # Enrich with channel info (limit to 10 concurrent operations)
                enriched_subs = []
                batch_size = 10
                for i in range(0, len(subscriptions), batch_size):
                    batch = subscriptions[i:i+batch_size]
                    tasks = [self.get_channel_info(channel["id"]) for channel in batch]
                    channel_infos = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for j, info in enumerate(channel_infos):
                        if isinstance(info, Exception):
                            logger.error(f"Error enriching channel: {str(info)}")
                            enriched_subs.append(batch[j])
                        elif info:
                            enriched_subs.append(info)
                        else:
                            enriched_subs.append(batch[j])
                
                return enriched_subs
            
            return []
        
        except Exception as e:
            logger.error(f"Error in _get_subscriptions_using_ytsubs: {str(e)}")
            return []
    
    async def _get_subscriptions_from_list(self) -> List[Dict[str, Any]]:
        """
        Alternative method to fetch subscriptions using the subscription list page.
        """
        try:
            cookies_path = Path('cookies.txt')
            if not cookies_path.exists():
                return []
                
            # URL for subscription list
            url = "https://www.youtube.com/feed/channels"
            logger.info(f"Fetching subscriptions from list: {url}")
            
            loop = asyncio.get_event_loop()
            
            def extract_channel_list():
                import subprocess
                import json
                import re
                
                # Command to fetch the subscription list page with debug info
                cmd = [
                    "yt-dlp",
                    "--dump-pages",  # Dump the HTML pages instead of videos
                    "--no-download",
                    "--cookies", str(cookies_path),
                    "--no-warnings",
                    url
                ]
                
                logger.info(f"Running subscription list command: {' '.join(cmd)}")
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"Error fetching subscription list: {result.stderr}")
                    return []
                
                # Extract channel IDs from various patterns in the HTML
                channels = []
                channel_ids = set()
                
                # Multiple regex patterns to extract channel info from different parts of the page
                channel_patterns = [
                    # Match channel links with ID
                    r'href="/channel/(UC[a-zA-Z0-9_-]{22})"[^>]*>([^<]+)</a>',
                    # Match channel links with handle
                    r'href="/@([^"]+)"[^>]*>([^<]+)</a>',
                    # Match JSON data with channel info
                    r'"channelId":"(UC[a-zA-Z0-9_-]{22})","title":"([^"]+)"',
                ]
                
                html_content = result.stdout
                
                # Try to extract structured data directly
                try:
                    # Look for initialData JSON
                    json_match = re.search(r'var ytInitialData = (.+?);</script>', html_content)
                    if json_match:
                        data_json = json_match.group(1)
                        data = json.loads(data_json)
                        
                        # Navigate to subscriptions in the JSON structure
                        if 'contents' in data and 'twoColumnBrowseResultsRenderer' in data['contents']:
                            main_section = data['contents']['twoColumnBrowseResultsRenderer']['tabs'][0]['tabRenderer']['content']
                            if 'sectionListRenderer' in main_section:
                                section_list = main_section['sectionListRenderer']['contents']
                                for section in section_list:
                                    if 'itemSectionRenderer' in section:
                                        items = section['itemSectionRenderer']['contents']
                                        for item in items:
                                            if 'shelfRenderer' in item and 'content' in item['shelfRenderer']:
                                                if 'gridRenderer' in item['shelfRenderer']['content']:
                                                    grid_items = item['shelfRenderer']['content']['gridRenderer']['items']
                                                    for grid_item in grid_items:
                                                        if 'gridChannelRenderer' in grid_item:
                                                            channel_data = grid_item['gridChannelRenderer']
                                                            if 'channelId' in channel_data:
                                                                channel_id = channel_data['channelId']
                                                                if channel_id not in channel_ids:
                                                                    channel_ids.add(channel_id)
                                                                    title = channel_data.get('title', {}).get('simpleText', 'Unknown Channel')
                                                                    
                                                                    # Try to extract thumbnail URL
                                                                    thumbnail_url = None
                                                                    if 'thumbnail' in channel_data and 'thumbnails' in channel_data['thumbnail']:
                                                                        thumbnails = channel_data['thumbnail']['thumbnails']
                                                                        if thumbnails and len(thumbnails) > 0:
                                                                            thumbnail_url = thumbnails[-1].get('url', '')
                                                                    
                                                                    if not thumbnail_url:
                                                                        thumbnail_url = f"https://yt3.googleusercontent.com/channel/{channel_id}"
                                                                    
                                                                    channels.append({
                                                                        "id": channel_id,
                                                                        "title": title,
                                                                        "thumbnail_url": thumbnail_url,
                                                                        "description": ""
                                                                    })
                except Exception as e:
                    logger.error(f"Error parsing YouTube JSON data: {str(e)}")
                
                # If we couldn't extract channels from JSON, try regex patterns
                if not channels:
                    for pattern in channel_patterns:
                        matches = re.findall(pattern, html_content)
                        for match in matches:
                            channel_id = match[0]
                            title = match[1]
                            
                            # For handle-based channels, get the actual channel ID
                            if not channel_id.startswith('UC'):
                                continue
                            
                            if channel_id not in channel_ids:
                                channel_ids.add(channel_id)
                                channels.append({
                                    "id": channel_id,
                                    "title": title,
                                    "thumbnail_url": f"https://yt3.googleusercontent.com/channel/{channel_id}",
                                    "description": ""
                                })
                
                logger.info(f"Found {len(channels)} subscribed channels from subscription list")
                return channels
            
            # Extract subscriptions in a thread pool
            return await loop.run_in_executor(None, extract_channel_list)
            
        except Exception as e:
            logger.error(f"Error in _get_subscriptions_from_list: {str(e)}")
            return [] 