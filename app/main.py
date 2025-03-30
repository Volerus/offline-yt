from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uvicorn

from app.api.routes import router as api_router
from app.database.setup import init_db

app = FastAPI(title="Offline YouTube Viewer")

# CORS settings for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    await init_db()

# Include API routes
app.include_router(api_router, prefix="/api")

# Mount downloads directory as static files
downloads_dir = Path("downloads")
if not downloads_dir.exists():
    downloads_dir.mkdir(parents=True)

app.mount("/downloads", StaticFiles(directory=str(downloads_dir)), name="downloads")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Offline YouTube Viewer API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 