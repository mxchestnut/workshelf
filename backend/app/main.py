"""
Work Shelf - FastAPI Application
Main entry point for the backend API
"""
import os
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import get_db

# Initialize Sentry for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        # Set traces_sample_rate to 1.0 to capture 100% of transactions for performance monitoring
        # Adjust this in production to reduce volume
        traces_sample_rate=0.1,  # 10% of requests for performance monitoring
        # Capture request/response data
        send_default_pii=False,  # Set True if you want to capture user emails, IPs, etc.
        environment=os.getenv("ENVIRONMENT", "production"),
        release=os.getenv("GIT_SHA", "unknown"),
    )
    print(f"[SENTRY] Initialized for environment: {os.getenv('ENVIRONMENT', 'production')}")
else:
    print("[SENTRY] Not configured (SENTRY_DSN not set)")

app = FastAPI(
    title="Work Shelf API",
    description="Social infrastructure platform for creators",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Standard CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://workshelf.dev",
        "https://www.workshelf.dev",
        "https://app.workshelf.dev",
        "https://admin.workshelf.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

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
