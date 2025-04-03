import logging
import uvicorn
import sys
import os
from app.main import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
# Set specific logger levels
logging.getLogger('app.services.youtube').setLevel(logging.DEBUG)

if __name__ == "__main__":
    # Run the FastAPI application
    # Disable reload when running as a packaged app (PyInstaller sets sys.frozen)
    # Also check for an environment variable just in case sys.frozen isn't reliable
    is_packaged = getattr(sys, 'frozen', False) or os.environ.get('RUNNING_AS_PACKAGED') == 'true'
    reload_enabled = not is_packaged

    logging.info(f"Starting Uvicorn. Packaged: {is_packaged}, Reload enabled: {reload_enabled}")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=reload_enabled)