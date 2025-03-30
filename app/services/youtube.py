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
            self.logger.error(f"Error constructing thumbnail URL: {str(e)}")
        
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
                'extract_flat': False,  # Don't extract full info for each video
                'playlistend': 1,      # Only need channel info, not all videos
                'skip_download': True,
                'quiet': True,         # Reduce console output
                'ignore_no_formats_error': True,
                'ignoreerrors': True,
                'no_warnings': True,
                'socket_timeout': 10,  # Add timeout to prevent hanging
            }
            
            def extract_info():
                with yt_dlp.YoutubeDL(channel_opts) as ydl:
                    return ydl.extract_info(url, download=False, process=False)  # process=False for faster extraction
            
            info = await loop.run_in_executor(None, extract_info)
            
            if not info:
                return None
            
            # If the channel_id is a handle (@Username), get the actual YouTube channel ID
            actual_channel_id = info.get('channel_id', channel_id)
            
            # Use simpler thumbnail URL construction if possible
            if actual_channel_id.startswith('UC'):
                thumbnail_url = f"https://i.ytimg.com/vi/{actual_channel_id}/hqdefault.jpg"
            else:
                thumbnail_url = info.get('thumbnail', '')
            
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
        """Get the download progress for a video"""
        return self.active_downloads.get(video_id, 0.0) 