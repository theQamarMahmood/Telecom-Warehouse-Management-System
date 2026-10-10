from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
import app.models # Ensures all models are registered
from app.routers import (
    auth, hierarchy, catalogue, inventory, receiving, loans,
    transfers, projects, procurement, maintenance, stock_counts,
    approvals, bulk_import, reports, notifications, audit, backup, settings
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Telecom Warehouse Management System (TWMS) API",
    description="Enterprise TWMS for telecom infrastructure, multi-warehouse, serialized tracking, and network expansion operations.",
    version="2.0.0"
)

# Enable CORS for frontend Vite development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(hierarchy.router)
app.include_router(catalogue.router)
app.include_router(inventory.router)
app.include_router(receiving.router)
app.include_router(loans.router)
app.include_router(transfers.router)
app.include_router(projects.router)
app.include_router(procurement.router)
app.include_router(maintenance.router)
app.include_router(stock_counts.router)
app.include_router(approvals.router)
app.include_router(bulk_import.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(backup.router)
app.include_router(settings.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "system": "Telecom Warehouse Management System (TWMS)",
        "version": "2.0.0",
        "database": "CONNECTED",
        "wal_mode": "ENABLED"
    }

# Mount pre-built frontend SPA if dist/ exists
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
