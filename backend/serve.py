import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure current directory is on python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)

    print("=" * 60)
    print("TELECOM WAREHOUSE MANAGEMENT SYSTEM (TWMS) - BACKEND API")
    print("Serving on http://127.0.0.1:8000")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 60)

    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")
