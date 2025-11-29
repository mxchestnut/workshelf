"""
Work Shelf - FastAPI Application
Main entry point for the backend API
"""
import os
from fastapi import FastAPI, Request, Depends, HTTPException
import uuid
import time
import json
import logging
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

# --------------------------
# Request ID & Logging Middleware
# --------------------------

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("workshelf")

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
RATE_LIMIT_REDIS_PREFIX = "rate:ip:"  # key namespace

try:
    import redis  # optional; if unavailable, fallback to in-memory
    _redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "redis"), port=int(os.getenv("REDIS_PORT", "6379")), db=0)
    _redis_client.ping()
except Exception:
    _redis_client = None
    _in_memory_hits = {}
    logger.warning("[rate-limit] Redis unavailable; using in-memory counters (not cluster-safe)")

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    start = time.time()
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting (simple IP-based)
    limited = False
    remaining = None
    if RATE_LIMIT_PER_MINUTE > 0:
        window = int(time.time() // 60)  # current minute bucket
        key = f"{RATE_LIMIT_REDIS_PREFIX}{client_ip}:{window}"
        try:
            if _redis_client:
                hits = _redis_client.incr(key)
                if hits == 1:
                    _redis_client.expire(key, 65)  # expire just after a minute
            else:
                hits = _in_memory_hits.get(key, 0) + 1
                _in_memory_hits[key] = hits
            remaining = max(RATE_LIMIT_PER_MINUTE - hits, 0)
            if hits > RATE_LIMIT_PER_MINUTE:
                limited = True
        except Exception as e:
            logger.error(f"rate_limit_error={e}")

    if limited:
        body = {
            "detail": "Rate limit exceeded",
            "limit": RATE_LIMIT_PER_MINUTE,
            "retry_after_seconds": 60 - (int(time.time()) % 60),
            "request_id": request_id,
        }
        log_line = {
            "event": "rate_limited",
            "request_id": request_id,
            "ip": client_ip,
            "path": request.url.path,
            "method": request.method,
            "limit": RATE_LIMIT_PER_MINUTE,
        }
        logger.info(json.dumps(log_line))
        return JSONResponse(status_code=429, content=body, headers={"X-Request-ID": request_id})

    try:
        response = await call_next(request)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        error_log = {
            "event": "request_error",
            "request_id": request_id,
            "ip": client_ip,
            "path": request.url.path,
            "method": request.method,
            "error": str(e),
            "duration_ms": duration_ms,
        }
        logger.error(json.dumps(error_log))
        raise

    duration_ms = int((time.time() - start) * 1000)
    log_line = {
        "event": "request",
        "request_id": request_id,
        "ip": client_ip,
        "path": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "duration_ms": duration_ms,
        "remaining_quota": remaining,
    }
    logger.info(json.dumps(log_line))
    response.headers["X-Request-ID"] = request_id
    if remaining is not None:
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
