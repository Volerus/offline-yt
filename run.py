import logging
import uvicorn
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
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True) 