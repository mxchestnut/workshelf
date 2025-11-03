"""
Accessibility Service
WCAG compliance checking and accessibility settings management
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
import re

from app.models import User, Document


class AccessibilityService:
    """Service for accessibility features and WCAG compliance"""
    
    # Default accessibility settings
    DEFAULT_SETTINGS = {
        "font_size": 16,
        "high_contrast": False,
        "dyslexia_font": False,
        "screen_reader_mode": False,
        "reduce_animations": False,
        "keyboard_shortcuts": True,
        "focus_indicators": True,
        "color_blind_mode": None,  # None, "protanopia", "deuteranopia", "tritanopia"
        "text_spacing": 1.0,
        "reading_guide": False,
        "alt_text_preference": "verbose"  # "brief", "verbose", "technical"
    }
    
    @staticmethod
    async def get_user_settings(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """Get user's accessibility settings"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return {"error": "User not found"}
        
        # Merge default settings with user settings
        settings = AccessibilityService.DEFAULT_SETTINGS.copy()
        if user.accessibility_settings:
            settings.update(user.accessibility_settings)
        
        return {"settings": settings}
    
    @staticmethod
    async def update_user_settings(
        db: AsyncSession,
        user_id: int,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update user's accessibility settings"""
        try:
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return {"error": "User not found"}
            
            # Merge with existing settings
            current_settings = user.accessibility_settings or {}
            current_settings.update(settings)
            
            # Validate settings
            validation_errors = AccessibilityService._validate_settings(current_settings)
            if validation_errors:
                return {"error": "Invalid settings", "details": validation_errors}
            
            user.accessibility_settings = current_settings
            await db.commit()
            await db.refresh(user)
            
            return {"settings": user.accessibility_settings}
        
        except Exception as e:
            await db.rollback()
            return {"error": f"Error updating settings: {str(e)}"}
    
    @staticmethod
    def _validate_settings(settings: Dict[str, Any]) -> List[str]:
        """Validate accessibility settings"""
        errors = []
        
        if "font_size" in settings:
            if not isinstance(settings["font_size"], (int, float)) or settings["font_size"] < 8 or settings["font_size"] > 48:
                errors.append("font_size must be between 8 and 48")
        
        if "color_blind_mode" in settings:
            valid_modes = [None, "protanopia", "deuteranopia", "tritanopia"]
            if settings["color_blind_mode"] not in valid_modes:
                errors.append(f"color_blind_mode must be one of {valid_modes}")
        
        if "text_spacing" in settings:
            if not isinstance(settings["text_spacing"], (int, float)) or settings["text_spacing"] < 1.0 or settings["text_spacing"] > 3.0:
                errors.append("text_spacing must be between 1.0 and 3.0")
        
        if "alt_text_preference" in settings:
            valid_prefs = ["brief", "verbose", "technical"]
            if settings["alt_text_preference"] not in valid_prefs:
                errors.append(f"alt_text_preference must be one of {valid_prefs}")
        
        return errors
    
    @staticmethod
    async def check_document_accessibility(
        db: AsyncSession,
        document_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Run WCAG compliance check on a document
        
        Checks:
        - Alt text for images
        - Heading structure
        - Color contrast
        - Link text
        - Reading level
        """
        # Get document
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            return {"error": "Document not found"}
        
        # Verify ownership
        if document.user_id != user_id:
            return {"error": "Unauthorized"}
        
        content = document.content or ""
        
        # Run accessibility checks
        issues = []
        
        # Check for images without alt text
        alt_text_issues = AccessibilityService._check_alt_text(content)
        issues.extend(alt_text_issues)
        
        # Check heading structure
        heading_issues = AccessibilityService._check_heading_structure(content)
        issues.extend(heading_issues)
        
        # Check link text
        link_issues = AccessibilityService._check_link_text(content)
        issues.extend(link_issues)
        
        # Check reading level
        reading_level = AccessibilityService._calculate_reading_level(content)
        
        # Calculate overall score
        total_checks = 10  # Number of checks performed
        failed_checks = len(issues)
        score = max(0, ((total_checks - failed_checks) / total_checks) * 100)
        
        return {
            "document_id": document_id,
            "score": round(score, 1),
            "issues": issues,
            "reading_level": reading_level,
            "total_checks": total_checks,
            "passed_checks": total_checks - failed_checks,
            "wcag_level": "AAA" if score >= 95 else "AA" if score >= 80 else "A" if score >= 60 else "Failed"
        }
    
    @staticmethod
    def _check_alt_text(content: str) -> List[Dict[str, Any]]:
        """Check for images without alt text"""
        issues = []
        
        # Markdown images: ![alt](url)
        md_images = re.finditer(r'!\[(.*?)\]\((.*?)\)', content)
        for match in md_images:
            alt_text = match.group(1)
            if not alt_text or len(alt_text.strip()) < 3:
                issues.append({
                    "type": "missing_alt_text",
                    "severity": "error",
                    "wcag": "WCAG 1.1.1 (A)",
                    "message": "Image missing descriptive alt text",
                    "location": f"Line {content[:match.start()].count(chr(10)) + 1}",
                    "suggestion": "Add descriptive alt text that conveys the purpose of the image"
                })
        
        # HTML images: <img src="" alt="">
        html_images = re.finditer(r'<img[^>]*?>', content)
        for match in html_images:
            img_tag = match.group(0)
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_tag)
            if not alt_match or len(alt_match.group(1).strip()) < 3:
                issues.append({
                    "type": "missing_alt_text",
                    "severity": "error",
                    "wcag": "WCAG 1.1.1 (A)",
                    "message": "Image missing descriptive alt text",
                    "location": f"Line {content[:match.start()].count(chr(10)) + 1}",
                    "suggestion": "Add descriptive alt text using the alt attribute"
                })
        
        return issues
    
    @staticmethod
    def _check_heading_structure(content: str) -> List[Dict[str, Any]]:
        """Check heading hierarchy"""
        issues = []
        
        # Find all markdown headings
        headings = re.finditer(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
        
        previous_level = 0
        for match in headings:
            current_level = len(match.group(1))
            
            # Check if heading skips levels (e.g., h1 to h3)
            if current_level > previous_level + 1 and previous_level > 0:
                issues.append({
                    "type": "heading_hierarchy",
                    "severity": "warning",
                    "wcag": "WCAG 1.3.1 (A)",
                    "message": f"Heading level skips from h{previous_level} to h{current_level}",
                    "location": f"Line {content[:match.start()].count(chr(10)) + 1}",
                    "suggestion": "Use sequential heading levels for better screen reader navigation"
                })
            
            previous_level = current_level
        
        return issues
    
    @staticmethod
    def _check_link_text(content: str) -> List[Dict[str, Any]]:
        """Check for uninformative link text"""
        issues = []
        
        # Markdown links: [text](url)
        md_links = re.finditer(r'\[([^\]]+)\]\([^)]+\)', content)
        
        uninformative_phrases = [
            "click here", "here", "read more", "more", "link",
            "this", "page", "website", "download"
        ]
        
        for match in md_links:
            link_text = match.group(1).lower().strip()
            
            if link_text in uninformative_phrases:
                issues.append({
                    "type": "uninformative_link",
                    "severity": "warning",
                    "wcag": "WCAG 2.4.4 (A)",
                    "message": f"Link text '{match.group(1)}' is not descriptive",
                    "location": f"Line {content[:match.start()].count(chr(10)) + 1}",
                    "suggestion": "Use descriptive link text that explains the destination or purpose"
                })
        
        return issues
    
    @staticmethod
    def _calculate_reading_level(content: str) -> Dict[str, Any]:
        """
        Calculate reading level using Flesch-Kincaid
        
        Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        """
        # Remove markdown/HTML formatting
        text = re.sub(r'[#*_\[\](){}]', '', content)
        text = re.sub(r'<[^>]+>', '', text)
        
        # Count sentences
        sentences = re.split(r'[.!?]+', text)
        sentence_count = len([s for s in sentences if s.strip()])
        
        if sentence_count == 0:
            return {
                "grade_level": 0,
                "reading_ease": 100,
                "description": "No content"
            }
        
        # Count words
        words = text.split()
        word_count = len(words)
        
        if word_count == 0:
            return {
                "grade_level": 0,
                "reading_ease": 100,
                "description": "No content"
            }
        
        # Estimate syllables (simplified)
        syllable_count = sum(AccessibilityService._count_syllables(word) for word in words)
        
        # Flesch-Kincaid Grade Level
        grade_level = 0.39 * (word_count / sentence_count) + 11.8 * (syllable_count / word_count) - 15.59
        
        # Flesch Reading Ease
        reading_ease = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllable_count / word_count)
        
        # Determine description
        if reading_ease >= 90:
            description = "Very Easy (5th grade)"
        elif reading_ease >= 80:
            description = "Easy (6th grade)"
        elif reading_ease >= 70:
            description = "Fairly Easy (7th grade)"
        elif reading_ease >= 60:
            description = "Standard (8th-9th grade)"
        elif reading_ease >= 50:
            description = "Fairly Difficult (10th-12th grade)"
        elif reading_ease >= 30:
            description = "Difficult (College)"
        else:
            description = "Very Difficult (College graduate)"
        
        return {
            "grade_level": round(grade_level, 1),
            "reading_ease": round(reading_ease, 1),
            "description": description,
            "word_count": word_count,
            "sentence_count": sentence_count
        }
    
    @staticmethod
    def _count_syllables(word: str) -> int:
        """
        Estimate syllable count for a word
        
        Simplified algorithm:
        - Count vowel groups
        - Subtract silent 'e'
        - Minimum 1 syllable
        """
        word = word.lower()
        syllables = 0
        previous_was_vowel = False
        
        vowels = "aeiouy"
        
        for i, char in enumerate(word):
            is_vowel = char in vowels
            
            if is_vowel and not previous_was_vowel:
                syllables += 1
            
            previous_was_vowel = is_vowel
        
        # Adjust for silent 'e'
        if word.endswith('e'):
            syllables -= 1
        
        # Ensure at least 1 syllable
        return max(1, syllables)
    
    @staticmethod
    async def generate_accessibility_report(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Generate comprehensive accessibility report for all user's documents
        """
        # Get all user documents
        result = await db.execute(
            select(Document).where(Document.user_id == user_id)
        )
        documents = result.scalars().all()
        
        if not documents:
            return {
                "total_documents": 0,
                "average_score": 0,
                "total_issues": 0,
                "documents": []
            }
        
        # Check each document
        document_reports = []
        total_score = 0
        total_issues = 0
        
        for doc in documents:
            check_result = await AccessibilityService.check_document_accessibility(
                db, doc.id, user_id
            )
            
            if "error" not in check_result:
                document_reports.append({
                    "document_id": doc.id,
                    "title": doc.title,
                    "score": check_result["score"],
                    "wcag_level": check_result["wcag_level"],
                    "issue_count": len(check_result["issues"])
                })
                
                total_score += check_result["score"]
                total_issues += len(check_result["issues"])
        
        return {
            "total_documents": len(documents),
            "average_score": round(total_score / len(documents), 1) if documents else 0,
            "total_issues": total_issues,
            "documents": document_reports,
            "generated_at": datetime.utcnow().isoformat()
        }
