import yt_dlp
import json
import sys
from datetime import datetime, timezone

# Configure yt-dlp options
video_opts = {
    'extract_flat': False,
    'ignoreerrors': True,
    'quiet': True,
    'playlistend': 2,
}

url = 'https://www.youtube.com/channel/UCUNOwz9KTDIhhTTN3_ptUDA/videos'

try:
    with yt_dlp.YoutubeDL(video_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        entries = info.get('entries', [])
        
        if entries and len(entries) > 0:
            first_entry = entries[0]
            # Print upload date and timestamp
            print(f'Video ID: {first_entry.get("id")}')
            print(f'Title: {first_entry.get("title")}')
            print(f'Upload date: {first_entry.get("upload_date")}')
            print(f'Timestamp: {first_entry.get("timestamp")}')
            
            # Check all available date fields
            date_fields = [
                'upload_date', 'timestamp', 'release_timestamp', 
                'release_date', 'published_at', 'published_timestamp'
            ]
            
            print('\nAvailable date fields:')
            for field in date_fields:
                if field in first_entry:
                    print(f'{field}: {first_entry.get(field)}')
            
            # Save the full entry structure for analysis
            with open('first_entry.json', 'w') as f:
                json.dump(first_entry, f, indent=2)
                print('\nFull entry saved to first_entry.json')
except Exception as e:
    print(f'Error: {str(e)}') 