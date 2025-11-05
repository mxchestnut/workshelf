"""
Work Shelf - FastAPI Application
Main entry point for the backend API
"""
from fastapi import FastAPI, Request
from fastapi.responses import Response
from app.api.v1 import api_router
from app.core.config import settings

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

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "work-shelf-api"
    }

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
