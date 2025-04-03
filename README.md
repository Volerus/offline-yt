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


## TODO

- Clean up UI
- Clean DB to allow new videos
- Optimization on fetch videos and channels
- Interested vs non interested list (Remove the non interested list)
- Option in settings to disable download
- Repackage into an offline mac app/win app
- Repackage into ios/android app
- Maybe host a backend locally and have frontend app with connection

## macOS Application Packaging Roadmap

### Approaches for macOS Packaging

#### 1. Using Electron (Recommended for Desktop Apps)

[Electron](https://www.electronjs.org/) is a popular framework for creating cross-platform desktop applications using web technologies.

**Implementation Steps:**

1. Create an Electron wrapper for your application
2. Configure the main process to start the FastAPI backend
3. Bundle the React frontend with the Electron app
4. Package the application using electron-builder

#### 2. Using py2app (Python-Focused Approach)

[py2app](https://py2app.readthedocs.io/en/latest/) is a tool for creating standalone macOS applications from Python scripts.

**Implementation Steps:**

1. Create a launcher script that starts the FastAPI server
2. Configure py2app to include all necessary dependencies
3. Bundle the React frontend with the application
4. Package using py2app

#### 3. Commercial Option: Platypus

[Platypus](https://sveinbjorn.org/platypus) is a macOS application that creates native macOS applications from scripts.

### Implementation Roadmap

1. Complete existing TODO items, especially "Clean up UI" and "Optimization on fetch videos and channels"
2. Choose the packaging approach (Electron recommended for better user experience)
3. Configure the application to work properly in a bundled environment:
   - Update file paths to be relative to the application bundle
   - Handle database location correctly
   - Ensure the application can start/stop the backend server properly
4. Test extensively on macOS to ensure all features work as expected
5. Add macOS-specific enhancements like dock menu, TouchBar support, or native notifications

### Considerations for macOS App Distribution

1. **Code Signing**: Requires an Apple Developer account ($99/year) for code signing your application
2. **App Notarization**: Required for running without security warnings on recent macOS versions
3. **Database Location**: Update application to use a database location within the macOS app sandbox
4. **Updates**: Implement an update mechanism for the application

## Local Server Hosting Roadmap

This section outlines how to set up the application to be hosted on a local server, allowing access from multiple devices on your network.

### Implementation Approach

#### Server-side Setup

1. **Configure for Network Access**
   - Update the FastAPI server to listen on all network interfaces (not just localhost)
   - Implement proper authentication for network access
   - Configure CORS settings to allow connections from specific devices/IPs

2. **Deployment Options**
   - **Option A: Direct FastAPI Deployment**
     - Run FastAPI with uvicorn directly on a server machine
     - Configure as a system service for automatic startup
   
   - **Option B: Docker Containerization**
     - Create Docker container for the application
     - Use docker-compose for managing backend and database
     - Simplifies deployment and environment consistency

   - **Option C: Reverse Proxy Setup**
     - Deploy behind Nginx or Caddy as a reverse proxy
     - Enables HTTPS, load balancing, and better security
     - Allows hosting multiple applications on the same server

3. **Database Considerations**
   - Configure a persistent database location
   - Implement regular backups
   - Consider SQLite for simplicity or PostgreSQL for more concurrent users

#### Client-side Access

1. **Web Browser Access**
   - Access via web browser using local IP or hostname
   - Mobile-responsive design for phone/tablet access
   - Consider PWA (Progressive Web App) capabilities for offline functionality

2. **Local DNS Setup (Optional)**
   - Configure local DNS for friendly names (e.g., ytoffline.local)
   - Use Multicast DNS (mDNS) for automatic discovery

### Implementation Steps

1. **Update Server Configuration**
   ```python
   # In app/main.py
   # Update CORS settings
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Or specific allowed origins
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   
   # In run.py or when starting uvicorn
   uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
   ```

2. **Create Systemd Service (Linux)**
   ```ini
   # /etc/systemd/system/ytoffline.service
   [Unit]
   Description=Offline YouTube Video Manager
   After=network.target
   
   [Service]
   User=your_username
   WorkingDirectory=/path/to/application
   ExecStart=/path/to/venv/bin/python run.py
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   ```

3. **Docker Setup (Alternative)**
   - Create Dockerfile and docker-compose.yml for containerization
   - Include volume mappings for persistent data (downloads and database)

4. **Security Considerations**
   - Implement authentication for all API endpoints
   - Use HTTPS even for local network (self-signed certificates)
   - Configure firewall to restrict access to authorized devices

### Testing and Validation

1. Test access from different devices on the local network
2. Verify downloads work correctly with server-based storage
3. Measure performance with multiple simultaneous users
4. Test automatic recovery after server restart


flowchart TD
    %% Frontend Layer
    subgraph "Frontend Layer"
        FEApp["React UI"]:::frontend
        FEComponents["UI Components"]:::frontend
        FEPages["Pages"]:::frontend
        FEAPI["API Service"]:::frontend
        FEState["State Management"]:::frontend
        FEHooks["Hooks"]:::frontend
    end

    %% Backend Layer
    subgraph "Backend Layer"
        FastAPI["FastAPI Application"]:::backend
        APIEndpoints["API Endpoints"]:::backend
        Pydantic["Pydantic Schemas"]:::backend
        YouTubeService["YouTube Video Processing Service"]:::backend
        DBService["Database Operations Service"]:::backend
    end

    %% Database Layer
    subgraph "Database Layer"
        DBSetup["Database Setup"]:::database
        DBModels["Database Models"]:::database
    end

    %% External Services
    subgraph "External Services"
        YtDlp["yt-dlp"]:::external
        Docker["Docker Container (Future)"]:::external
        Electron["Electron Wrapper (Future)"]:::external
        ReverseProxy["Reverse Proxy (Future)"]:::external
    end

    %% Frontend Internal Connections
    FEApp --> FEComponents
    FEApp --> FEPages
    FEApp --> FEState
    FEState --> FEHooks

    %% Frontend to Backend Interaction
    FEAPI -->|"HTTP_Request"| APIEndpoints
    FEApp --> FEAPI

    %% Backend Internal Connections
    APIEndpoints -->|"validates"| Pydantic
    APIEndpoints -->|"calls_service"| YouTubeService
    APIEndpoints -->|"calls_service"| DBService

    %% Backend to External and Database
    YouTubeService -->|"invokes"| YtDlp
    DBService -->|"queries"| DBSetup
    DBService -->|"queries"| DBModels

    %% Click Events
    click FastAPI "https://github.com/volerus/offline-yt/blob/main/app/main.py"
    click APIEndpoints "https://github.com/volerus/offline-yt/blob/main/app/api/routes.py"
    click DBSetup "https://github.com/volerus/offline-yt/blob/main/app/database/setup.py"
    click DBModels "https://github.com/volerus/offline-yt/blob/main/app/models/models.py"
    click Pydantic "https://github.com/volerus/offline-yt/blob/main/app/schemas/schemas.py"
    click YouTubeService "https://github.com/volerus/offline-yt/blob/main/app/services/youtube.py"
    click DBService "https://github.com/volerus/offline-yt/blob/main/app/services/database.py"
    click FEApp "https://github.com/volerus/offline-yt/blob/main/frontend/src/App.js"
    click FEComponents "https://github.com/volerus/offline-yt/tree/main/frontend/src/components/"
    click FEPages "https://github.com/volerus/offline-yt/tree/main/frontend/src/pages/"
    click FEAPI "https://github.com/volerus/offline-yt/blob/main/frontend/src/services/api.js"
    click FEState "https://github.com/volerus/offline-yt/blob/main/frontend/src/context/SettingsContext.js"
    click FEHooks "https://github.com/volerus/offline-yt/tree/main/frontend/src/hooks/"

    %% Styles
    classDef frontend fill:#F9E79F,stroke:#B7950B,stroke-width:2px;
    classDef backend fill:#AED6F1,stroke:#1B4F72,stroke-width:2px;
    classDef database fill:#ABEBC6,stroke:#1D8348,stroke-width:2px;
    classDef external fill:#F5B7B1,stroke:#922B21,stroke-width:2px;