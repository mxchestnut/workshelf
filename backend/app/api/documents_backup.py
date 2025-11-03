"""Document Management API - Basic version"""
from fastapi import APIRouter
router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/health")
async def health():
    return {"status": "ok"}
