import asyncio
import logging
from datetime import datetime, timedelta
from app.services.youtube import YouTubeService

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    # Initialize the YouTube service
    youtube_service = YouTubeService()
    
    # Get list of channels we want to test
    channel_ids = ["UCFhXFikryT4aFcLkLw2LBLA"]  # NileRed
    
    # Test date range (last 2 months)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=60)
    
    logger.info(f"Testing date range: {start_date} to {end_date}")
    
    # Test each channel
    for channel_id in channel_ids:
        logger.info(f"Testing channel: {channel_id}")
        
        # Test getting channel info
        channel_info = await youtube_service.get_channel_info(channel_id)
        logger.info(f"Channel info: {channel_info}")
        
        # Test getting videos
        logger.info(f"Fetching videos for channel {channel_id} from {start_date} to {end_date}")
        videos = await youtube_service.get_channel_videos(channel_id, start_date, end_date)
        
        logger.info(f"Found {len(videos)} videos")
        for i, video in enumerate(videos[:5]):  # Show first 5 videos only
            logger.info(f"Video {i+1}: {video['title']} (ID: {video['id']})")
            logger.info(f"  Published: {video['published_at']}")

if __name__ == "__main__":
    asyncio.run(main()) 