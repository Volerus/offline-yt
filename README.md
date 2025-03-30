# Offline YouTube Video Manager

A full-stack application for managing YouTube video downloads and offline viewing, built with FastAPI, React, and SQLite.

## Features

### Video Management
- **Video Discovery**: Browse and search videos from subscribed YouTube channels
- **Smart Filtering**: Filter videos by:
  - Channel
  - Time period (24 hours, 7 days, 2 weeks, 30 days, 3 months, 1 year)
  - Download status
- **Batch Operations**: Fetch multiple videos from channels within specified timeframes
- **Download Management**: 
  - Select video quality (360p, 480p, 720p, 1080p, or best available)
  - Track download progress in real-time
  - Resume interrupted downloads
  - Manage downloaded videos

### Channel Management
- Subscribe to YouTube channels
- Automatic channel metadata fetching
- Channel-based video filtering
- Manage channel subscriptions

### Video Player
- Built-in video player with standard controls
- Support for seeking within videos
- Fallback option to open videos in a new tab
- Video information display (duration, resolution, download date)

### User Interface
- Modern Material UI design
- Responsive layout for all screen sizes
- Grid-based video display
- Loading states and error handling
- Intuitive navigation

## Technical Stack

### Frontend
- **Framework**: React
- **UI Library**: Material-UI (MUI)
- **State Management**: React Query
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Development Tools**: 
  - ESLint
  - Webpack
  - npm/yarn

### Backend
- **Framework**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Video Processing**: yt-dlp
- **Authentication**: Built-in FastAPI security
- **API Documentation**: Swagger/OpenAPI

## Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 14 or higher
- pip (Python package manager)
- npm or yarn (Node.js package manager)

### Backend Setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Initialize the database:
   ```bash
   python -m app.database.setup
   ```

### Frontend Setup
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install  # or: yarn install
   ```

2. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

## Running the Application

### Development Mode
1. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start  # or: yarn start
   ```

### Production Mode
1. Build the frontend:
   ```bash
   cd frontend
   npm run build  # or: yarn build
   ```

2. Start the production server:
   ```bash
   uvicorn app.main:app
   ```

## API Endpoints

### Videos
- `GET /api/videos`: List videos with filtering options
- `POST /api/videos/fetch`: Fetch new videos from YouTube
- `POST /api/videos/download`: Download a video
- `GET /api/videos/{video_id}`: Get video details
- `GET /api/videos/{video_id}/progress`: Get download progress
- `DELETE /api/videos/{video_id}`: Delete a video

### Channels
- `GET /api/channels`: List subscribed channels
- `POST /api/channels`: Add a new channel subscription
- `GET /api/channels/{channel_id}`: Get channel details
- `DELETE /api/channels/{channel_id}`: Remove channel subscription

### Settings
- `GET /api/settings`: Get application settings
- `PUT /api/settings`: Update application settings

## Configuration

### Backend Configuration
Key settings in `app/config.py`:
- `DOWNLOAD_DIR`: Directory for storing downloaded videos
- `DATABASE_URL`: SQLite database location
- `MAX_CONCURRENT_DOWNLOADS`: Maximum simultaneous downloads
- `DEFAULT_VIDEO_FORMAT`: Default video quality setting

### Frontend Configuration
Key settings in `frontend/.env`:
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_ITEMS_PER_PAGE`: Number of items per page in lists
- `REACT_APP_DEFAULT_TIMEFRAME`: Default timeframe for video fetching

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── routes.py          # API endpoints
│   │   └── dependencies.py    # API dependencies
│   ├── database/
│   │   ├── setup.py          # Database initialization
│   │   └── models.py         # SQLAlchemy models
│   ├── services/
│   │   ├── youtube.py        # YouTube integration
│   │   └── database.py       # Database operations
│   └── schemas/
│       └── schemas.py        # Pydantic models
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── context/         # React context
│   └── public/              # Static assets
└── tests/                   # Test files
```

## Error Handling

### Backend Errors
- HTTP 400: Bad Request (invalid parameters)
- HTTP 404: Resource Not Found
- HTTP 500: Internal Server Error
- Custom error responses for video processing issues

### Frontend Error Handling
- API error handling with React Query
- User-friendly error messages
- Loading states for async operations
- Retry mechanisms for failed requests

## Development Guidelines

### Code Style
- Python: Follow PEP 8
- JavaScript: ESLint with Airbnb config
- Use TypeScript types/interfaces where possible
- Maintain consistent component structure

### Git Workflow
1. Create feature branches from main
2. Use descriptive commit messages
3. Submit pull requests for review
4. Merge after approval

### Testing
- Write unit tests for critical functionality
- Test API endpoints with pytest
- Test React components with Jest
- Run tests before committing

## Troubleshooting

### Common Issues
1. **Video Download Fails**
   - Check internet connection
   - Verify YouTube URL is valid
   - Ensure sufficient disk space
   - Check yt-dlp is up to date

2. **Video Playback Issues**
   - Verify video file exists
   - Check video format compatibility
   - Try alternate video player
   - Check browser console for errors

3. **Database Issues**
   - Check database file permissions
   - Verify SQLite installation
   - Check disk space
   - Backup database regularly

### Debug Mode
Enable debug logging:
```python
# Backend
import logging
logging.basicConfig(level=logging.DEBUG)

# Frontend
localStorage.setItem('debug', '*')
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Submit a pull request

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [SQLAlchemy](https://www.sqlalchemy.org/) 