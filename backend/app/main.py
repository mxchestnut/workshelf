"""
Work Shelf - FastAPI Application
Main entry point for the backend API
"""
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import get_db

app = FastAPI(
    title="Work Shelf API",
    description="Social infrastructure platform for creators",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Custom CORS middleware to ensure headers are always sent
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://workshelf.dev",
        "https://www.workshelf.dev",
        "https://app.workshelf.dev",
        "https://workshelf-frontend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io",
    ]
    
    # Handle preflight
    if request.method == "OPTIONS":
        response = Response()
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin"
            response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    response = await call_next(request)
    
    # Add CORS headers to response
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    
    # Add cache control to prevent browser caching CORS issues
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    
    return response

# NOTE: FastAPI CORSMiddleware removed because it was rejecting origins before our custom middleware could handle them
# Our custom middleware above handles all CORS logic

# Health check endpoints
@app.get("/health")
async def health_check():
    """
    Basic health check endpoint
    Returns service status and version
    """
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "work-shelf-api"
    }

@app.get("/health/live")
async def liveness():
    """
    Kubernetes/Container Apps liveness probe
    Returns 200 if service is running (doesn't check dependencies)
    Used to determine if container should be restarted
    """
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """
    Kubernetes/Container Apps readiness probe
    Returns 200 only if service and database are ready
    Used to determine if traffic should be routed to this instance
    """
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "database": "connected",
            "service": "work-shelf-api"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service not ready: {str(e)}"
        )

# Include API routes
app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
