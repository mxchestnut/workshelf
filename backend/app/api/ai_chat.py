"""
AI Chat API Routes
Conversational AI assistant with streaming responses
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Dict, Any
import os

from app.core.database import get_db
from app.core.auth import get_current_user


router = APIRouter(prefix="/ai", tags=["AI Chat"])


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream AI chat responses using Claude
    
    Takes conversation history and streams the response back.
    Helps writers with their creative process.
    """
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        from anthropic import AsyncAnthropic
        
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        
        # System prompt that guides Claude's behavior
        system_prompt = """You are a helpful writing assistant for creative writers. Your role is to:

1. Help writers develop their ideas, characters, and plots
2. Provide constructive feedback on their writing
3. Suggest improvements to grammar, style, and pacing
4. Brainstorm creative solutions to writing challenges
5. Answer questions about writing techniques and craft

IMPORTANT GUIDELINES:
- Be encouraging and supportive
- Provide specific, actionable feedback
- Ask clarifying questions when needed
- Respect the writer's creative vision
- Don't rewrite their work unless specifically asked
- Keep responses conversational and friendly

You're here to help writers CREATE, not to write FOR them."""

        # Convert request messages to Claude format
        claude_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Stream the response
        async def generate():
            async with client.messages.stream(
                model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
                max_tokens=2048,
                system=system_prompt,
                messages=claude_messages
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
