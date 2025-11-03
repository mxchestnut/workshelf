"""
Content Integrity Service
Plagiarism detection and AI content detection
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import os
import asyncio
import httpx
import xml.etree.ElementTree as ET

from app.models import (
    IntegrityCheck, Document, User,
    IntegrityCheckType, IntegrityCheckStatus
)


class ContentIntegrityService:
    """Service for content integrity checks (plagiarism and AI detection)"""
    
    # Placeholder API keys (set in environment)
    COPYSCAPE_USERNAME = os.getenv("COPYSCAPE_USERNAME", "")
    COPYSCAPE_API_KEY = os.getenv("COPYSCAPE_API_KEY", "")
    GPTZERO_API_KEY = os.getenv("GPTZERO_API_KEY", "")
    
    # Thresholds for automatic enforcement
    MAX_PLAGIARISM_SCORE = 25.0  # Max 25% similarity allowed
    MAX_AI_SCORE = 30.0  # Max 30% AI-generated content allowed
    
    @staticmethod
    async def auto_check_before_publish(
        db: AsyncSession,
        document_id: int,
        user_id: int,
        action: str = "publish"  # "publish" or "beta_submit"
    ) -> Dict[str, Any]:
        """
        Automatically run integrity check before publishing or beta submission
        
        This enforces Work Shelf's authenticity policy:
        - Users must write their own content
        - AI can assist with ideas, but not write the content
        - Plagiarism is not tolerated
        
        Returns:
            - passed: Boolean indicating if content passes integrity checks
            - check_id: ID of the integrity check
            - issues: List of any problems found
            - can_proceed: Whether the action can proceed
        """
        # Create automatic integrity check
        check_result = await ContentIntegrityService.create_integrity_check(
            db=db,
            document_id=document_id,
            user_id=user_id,
            check_type="combined"  # Always check both plagiarism and AI
        )
        
        if "error" in check_result:
            return {
                "passed": False,
                "can_proceed": False,
                "error": check_result["error"]
            }
        
        check = check_result["check"]
        
        # Wait for check to complete (in production, this would be async with webhooks)
        # For now, the mock implementation completes immediately
        
        issues = []
        passed = True
        
        # Check plagiarism score
        if check.plagiarism_score and check.plagiarism_score > ContentIntegrityService.MAX_PLAGIARISM_SCORE:
            issues.append({
                "type": "plagiarism",
                "severity": "critical",
                "score": check.plagiarism_score,
                "threshold": ContentIntegrityService.MAX_PLAGIARISM_SCORE,
                "message": f"Content shows {check.plagiarism_score}% similarity to existing sources. Maximum allowed is {ContentIntegrityService.MAX_PLAGIARISM_SCORE}%.",
                "matches": check.plagiarism_matches
            })
            passed = False
        
        # Check AI detection score
        if check.ai_score and check.ai_score > ContentIntegrityService.MAX_AI_SCORE:
            issues.append({
                "type": "ai_generated",
                "severity": "critical",
                "score": check.ai_score,
                "threshold": ContentIntegrityService.MAX_AI_SCORE,
                "message": f"Content appears to be {check.ai_score}% AI-generated. Maximum allowed is {ContentIntegrityService.MAX_AI_SCORE}%.",
                "details": check.ai_details,
                "explanation": "Work Shelf is for authentic human creativity. AI can help with ideas, but the writing must be yours."
            })
            passed = False
        
        return {
            "passed": passed,
            "can_proceed": passed,
            "check_id": check.id,
            "action": action,
            "plagiarism_score": check.plagiarism_score,
            "ai_score": check.ai_score,
            "issues": issues,
            "cost_cents": check.cost_cents,
            "message": "Content passed integrity checks!" if passed else "Content failed integrity checks. Please review the issues.",
            "policy_reminder": "Work Shelf celebrates authentic human creativity. Your unique voice is what makes your work valuable."
        }
    
    @staticmethod
    async def create_integrity_check(
        db: AsyncSession,
        document_id: int,
        user_id: int,
        check_type: str = "combined"
    ) -> Dict[str, Any]:
        """
        Create a new integrity check for a document
        
        Args:
            document_id: Document to check
            user_id: User requesting the check
            check_type: Type of check (plagiarism, ai_detection, combined)
        """
        try:
            # Get document
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()
            if not document:
                return {"error": "Document not found"}
            
            # Create integrity check record
            check = IntegrityCheck(
                document_id=document_id,
                user_id=user_id,
                check_type=IntegrityCheckType(check_type),
                status=IntegrityCheckStatus.PENDING,
                content_snapshot=document.content or "",
                word_count=len((document.content or "").split())
            )
            
            db.add(check)
            await db.commit()
            await db.refresh(check)
            
            # Start processing asynchronously (in background)
            # Note: In production, this would be a background task/queue
            asyncio.create_task(
                ContentIntegrityService._process_check(check.id, check_type)
            )
            
            return {"check": check}
        
        except Exception as e:
            await db.rollback()
            return {"error": f"Error creating integrity check: {str(e)}"}
    
    @staticmethod
    async def _process_check(check_id: int, check_type: str):
        """
        Process integrity check in background
        
        This is a placeholder that simulates the process.
        In production, this would:
        1. Call external APIs (Copyscape, GPTZero, etc.)
        2. Parse results
        3. Update the check record
        """
        # This would normally use a background task queue (Celery, etc.)
        # For now, we'll just mark it as completed with mock data
        pass
    
    @staticmethod
    async def run_plagiarism_check(
        db: AsyncSession,
        check_id: int
    ) -> Dict[str, Any]:
        """
        Run plagiarism detection using Copyscape
        
        Searches billions of web pages to find matching content.
        Returns matches with URLs, snippets, and similarity percentages.
        
        Minimum text length: 25 words recommended
        """
        try:
            # Get check
            result = await db.execute(
                select(IntegrityCheck).where(IntegrityCheck.id == check_id)
            )
            check = result.scalar_one_or_none()
            if not check:
                return {"error": "Check not found"}
            
            # Update status
            check.status = IntegrityCheckStatus.PROCESSING
            check.processing_started_at = datetime.utcnow()
            await db.commit()
            
            # Check if Copyscape credentials are configured
            if not ContentIntegrityService.COPYSCAPE_USERNAME or not ContentIntegrityService.COPYSCAPE_API_KEY:
                raise ValueError("Copyscape API credentials not configured. Set COPYSCAPE_USERNAME and COPYSCAPE_API_KEY environment variables.")
            
            # Check minimum text length
            word_count = len(check.content_snapshot.split())
            if word_count < 25:
                raise ValueError(f"Text too short for plagiarism detection. Minimum 25 words, got {word_count}.")
            
            # Call Copyscape API
            url = "https://www.copyscape.com/api/"
            
            data = {
                "u": ContentIntegrityService.COPYSCAPE_USERNAME,
                "k": ContentIntegrityService.COPYSCAPE_API_KEY,
                "o": "csearch",  # Check by text (correct operation name)
                "t": check.content_snapshot,
                "e": "UTF-8"
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, data=data)
                
                if response.status_code != 200:
                    error_msg = f"Copyscape API error: {response.status_code} - {response.text}"
                    raise ValueError(error_msg)
                
                # Parse XML response
                root = ET.fromstring(response.content)
            
            # Check for error in response
            error = root.find("error")
            if error is not None:
                error_msg = error.text or "Unknown Copyscape error"
                raise ValueError(f"Copyscape error: {error_msg}")
            
            # Extract match count
            count_elem = root.find("count")
            match_count = int(count_elem.text) if count_elem is not None else 0
            
            # Get query words for percentage calculation
            query_words_elem = root.find("querywords")
            query_words = int(query_words_elem.text) if query_words_elem is not None else word_count
            
            # Extract all matches
            matches = []
            for result_elem in root.findall("result"):
                # Calculate percentage from minwordsmatched
                min_words_matched_elem = result_elem.find("minwordsmatched")
                min_words_matched = int(min_words_matched_elem.text) if min_words_matched_elem is not None else 0
                percent_matched = round((min_words_matched / query_words * 100), 2) if query_words > 0 else 0
                
                match_data = {
                    "url": result_elem.find("url").text if result_elem.find("url") is not None else "",
                    "title": result_elem.find("title").text if result_elem.find("title") is not None else "Untitled",
                    "snippet": result_elem.find("textsnippet").text if result_elem.find("textsnippet") is not None else "",
                    "percent_matched": percent_matched,
                    "words_matched": min_words_matched
                }
                matches.append(match_data)
            
            # Get API usage stats
            cost_elem = root.find("cost")
            balance_elem = root.find("balance")
            
            cost_usd = float(cost_elem.text) if cost_elem is not None else 0.0
            balance_usd = float(balance_elem.text) if balance_elem is not None else 0.0
            
            # Calculate overall plagiarism score (highest match percentage)
            plagiarism_score = max([m["percent_matched"] for m in matches], default=0)
            
            # Convert cost to cents
            cost_cents = round(cost_usd * 100)
            
            # Update check with results
            check.plagiarism_score = plagiarism_score
            check.plagiarism_matches = matches
            check.total_matches = match_count
            check.external_service = "copyscape"
            check.status = IntegrityCheckStatus.COMPLETED
            check.processing_completed_at = datetime.utcnow()
            check.cost_cents = cost_cents
            
            await db.commit()
            await db.refresh(check)
            
            return {
                "check": check,
                "plagiarism_score": plagiarism_score,
                "match_count": match_count,
                "matches": matches,
                "query_words": query_words,
                "cost_usd": cost_usd,
                "balance_usd": balance_usd
            }
        
        except Exception as e:
            check.status = IntegrityCheckStatus.FAILED
            check.error_message = str(e)
            await db.commit()
            return {"error": f"Plagiarism check failed: {str(e)}"}
    
    @staticmethod
    async def run_ai_detection(
        db: AsyncSession,
        check_id: int
    ) -> Dict[str, Any]:
        """
        Run AI content detection using GPTZero
        
        Integrates with GPTZero API to detect AI-generated content.
        Returns AI probability score, confidence, and detailed analysis.
        
        Minimum text length: 250 words recommended for accurate results
        """
        try:
            # Get check
            result = await db.execute(
                select(IntegrityCheck).where(IntegrityCheck.id == check_id)
            )
            check = result.scalar_one_or_none()
            if not check:
                return {"error": "Check not found"}
            
            # Update status
            check.status = IntegrityCheckStatus.PROCESSING
            check.processing_started_at = datetime.utcnow()
            await db.commit()
            
            # Check if GPTZero API key is configured
            if not ContentIntegrityService.GPTZERO_API_KEY:
                raise ValueError("GPTZero API key not configured. Set GPTZERO_API_KEY environment variable.")
            
            # Check minimum text length
            word_count = len(check.content_snapshot.split())
            if word_count < 50:
                raise ValueError(f"Text too short for reliable AI detection. Minimum 50 words, got {word_count}.")
            
            # Call GPTZero API
            url = "https://api.gptzero.me/v2/predict/text"
            headers = {
                "X-Api-Key": ContentIntegrityService.GPTZERO_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "document": check.content_snapshot,
                "version": "2025-10-30-base"  # Latest GPTZero model version
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    error_msg = f"GPTZero API error: {response.status_code} - {response.text}"
                    raise ValueError(error_msg)
                
                result_data = response.json()
            
            # Parse GPTZero response
            if not result_data.get("documents"):
                raise ValueError("Invalid GPTZero API response: no documents")
            
            doc_result = result_data["documents"][0]
            
            # Extract key metrics from updated API format
            predicted_class = doc_result.get("predicted_class", "unknown")
            confidence_score = doc_result.get("confidence_score", 0.0)
            completely_generated = doc_result.get("completely_generated_prob", 0.0)
            burstiness = doc_result.get("overall_burstiness", 0.0)
            
            # Get classification probabilities
            class_probs = doc_result.get("class_probabilities", {})
            ai_class_prob = class_probs.get("ai", 0.0)
            human_class_prob = class_probs.get("human", 0.0)
            mixed_class_prob = class_probs.get("mixed", 0.0)
            
            # AI score is the AI probability as percentage
            ai_score = round(ai_class_prob * 100, 2)
            
            # Confidence is from the API's confidence_score
            ai_confidence = round(confidence_score * 100, 2)
            
            # Build detailed analysis
            ai_details = {
                "classification": predicted_class,
                "confidence_score": confidence_score,
                "completely_generated_prob": completely_generated,
                "overall_burstiness": burstiness,
                "class_probabilities": {
                    "ai": ai_class_prob,
                    "human": human_class_prob,
                    "mixed": mixed_class_prob
                },
                "word_count": word_count,
                "interpretation": ContentIntegrityService._interpret_ai_score(ai_score),
                "result_message": doc_result.get("result_message", "")
            }
            
            # Add sentence-level analysis if available
            if "sentences" in doc_result:
                sentences = doc_result["sentences"][:10]  # Limit to first 10 for storage
                ai_details["sentence_analysis"] = [
                    {
                        "text": s.get("sentence", "")[:100],  # Truncate long sentences
                        "generated_prob": s.get("generated_prob", 0.0),
                        "perplexity": s.get("perplexity", 0.0)
                    }
                    for s in sentences
                ]
            
            # Calculate cost (estimated based on word count)
            # GPTZero pricing: ~$0.01 per 1000 words on Starter plan
            cost_cents = max(1, round(word_count / 1000 * 1))  # Minimum $0.01
            
            # Update check with results
            check.ai_score = ai_score
            check.ai_confidence = ai_confidence
            check.ai_details = ai_details
            check.external_service = "gptzero"
            check.status = IntegrityCheckStatus.COMPLETED
            check.processing_completed_at = datetime.utcnow()
            check.cost_cents = cost_cents
            
            await db.commit()
            await db.refresh(check)
            
            return {
                "check": check,
                "ai_score": ai_score,
                "ai_confidence": ai_confidence,
                "classification": predicted_class,
                "details": ai_details
            }
        
        except Exception as e:
            check.status = IntegrityCheckStatus.FAILED
            check.error_message = str(e)
            await db.commit()
            return {"error": f"AI detection failed: {str(e)}"}
    
    @staticmethod
    def _interpret_ai_score(ai_score: float) -> str:
        """Provide human-readable interpretation of AI detection score"""
        if ai_score < 30:
            return f"✅ Likely Human-Written ({ai_score:.1f}% AI probability) - Content appears to be authentic human writing."
        elif ai_score < 70:
            return f"⚠️  Mixed Content ({ai_score:.1f}% AI probability) - Some sections may be AI-assisted. Review your work to ensure it reflects your authentic voice."
        else:
            return f"❌ Likely AI-Generated ({ai_score:.1f}% AI probability) - Content appears to be primarily AI-generated. Work Shelf requires authentic human creativity."
    
    @staticmethod
    async def get_check_results(
        db: AsyncSession,
        check_id: int,
        user_id: int
    ) -> Optional[IntegrityCheck]:
        """Get integrity check results"""
        result = await db.execute(
            select(IntegrityCheck).where(
                and_(
                    IntegrityCheck.id == check_id,
                    IntegrityCheck.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_document_checks(
        db: AsyncSession,
        document_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[IntegrityCheck]:
        """Get all integrity checks for a document"""
        result = await db.execute(
            select(IntegrityCheck)
            .where(
                and_(
                    IntegrityCheck.document_id == document_id,
                    IntegrityCheck.user_id == user_id
                )
            )
            .order_by(IntegrityCheck.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_user_checks(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[IntegrityCheck]:
        """Get all integrity checks for a user"""
        result = await db.execute(
            select(IntegrityCheck)
            .where(IntegrityCheck.user_id == user_id)
            .order_by(IntegrityCheck.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
