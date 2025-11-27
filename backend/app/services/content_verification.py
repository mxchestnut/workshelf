"""
Content Verification Service
Check uploaded EPUBs for plagiarism, AI generation, and authenticity
"""
import os
import hashlib
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import anthropic
import httpx
from ebooklib import epub
import html2text


class ContentVerificationService:
    """
    Service to verify uploaded EPUB content for:
    1. Plagiarism detection
    2. AI-generated content detection
    3. Copyright violation checks
    4. Content quality assessment
    """
    
    def __init__(self):
        self.anthropic_client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.h = html2text.HTML2Text()
        self.h.ignore_links = True
        self.h.ignore_images = True
    
    async def verify_epub_content(
        self, 
        epub_path: str,
        author_name: str,
        title: str
    ) -> Dict:
        """
        Main verification pipeline for uploaded EPUB
        
        Returns verification result with scores and flags
        """
        result = {
            "verified": False,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
            "overall_score": 0.0,
            "warnings": [],
            "errors": [],
            "requires_review": False
        }
        
        try:
            # Extract text from EPUB
            text_content = await self._extract_epub_text(epub_path)
            
            if not text_content or len(text_content) < 1000:
                result["errors"].append("EPUB content is too short or unreadable")
                return result
            
            # Run verification checks
            result["checks"]["plagiarism"] = await self._check_plagiarism(
                text_content, title, author_name
            )
            
            result["checks"]["ai_detection"] = await self._detect_ai_content(
                text_content
            )
            
            result["checks"]["quality"] = await self._assess_quality(
                text_content, title
            )
            
            result["checks"]["copyright"] = await self._check_copyright_violations(
                text_content, title, author_name
            )
            
            # Calculate overall score and determine if verified
            result["overall_score"] = self._calculate_overall_score(result["checks"])
            
            # Determine verification status
            if result["overall_score"] >= 80:
                result["verified"] = True
            elif result["overall_score"] >= 60:
                result["requires_review"] = True
                result["warnings"].append("Content requires manual review by moderators")
            else:
                result["errors"].append("Content failed verification checks")
            
            return result
            
        except Exception as e:
            result["errors"].append(f"Verification error: {str(e)}")
            result["requires_review"] = True
            return result
    
    async def _extract_epub_text(self, epub_path: str, max_chars: int = 50000) -> str:
        """
        Extract text content from EPUB file
        Samples chapters to avoid processing massive books
        """
        try:
            book = epub.read_epub(epub_path)
            text_parts = []
            total_chars = 0
            
            # Get all document items
            items = [item for item in book.get_items() 
                    if item.get_type() == epub.ITEM_DOCUMENT]
            
            # Sample first few chapters and some middle/end chapters
            sample_indices = [0, 1, 2]  # First 3 chapters
            if len(items) > 10:
                sample_indices.extend([len(items)//2, len(items)-2, len(items)-1])
            elif len(items) > 5:
                sample_indices.extend([len(items)//2, len(items)-1])
            
            for idx in sample_indices:
                if idx >= len(items):
                    continue
                    
                item = items[idx]
                html_content = item.get_content().decode('utf-8', errors='ignore')
                text = self.h.handle(html_content)
                
                # Clean up whitespace
                text = re.sub(r'\s+', ' ', text).strip()
                
                text_parts.append(text)
                total_chars += len(text)
                
                if total_chars >= max_chars:
                    break
            
            return '\n\n'.join(text_parts)[:max_chars]
            
        except Exception as e:
            raise Exception(f"Failed to extract EPUB text: {str(e)}")
    
    async def _check_plagiarism(
        self, 
        text: str, 
        title: str,
        author: str
    ) -> Dict:
        """
        Check for plagiarism using multiple methods:
        1. Search for exact text matches online
        2. Check against known public domain works
        3. Use AI to detect copied content patterns
        """
        result = {
            "score": 100,  # Start at 100, deduct for issues
            "confidence": "high",
            "details": [],
            "flagged_passages": []
        }
        
        # Get a few distinctive passages to check
        passages = self._extract_distinctive_passages(text, count=5, length=200)
        
        # Check online for exact matches (sampling to avoid rate limits)
        online_matches = 0
        for passage in passages[:3]:  # Check first 3 passages
            if await self._search_text_online(passage):
                online_matches += 1
                result["flagged_passages"].append({
                    "text": passage[:100] + "...",
                    "reason": "Found online match"
                })
        
        if online_matches >= 2:
            result["score"] -= 40
            result["details"].append(
                f"Found {online_matches} passages with online matches"
            )
        
        # Use AI to analyze originality
        ai_analysis = await self._ai_analyze_originality(text[:5000], title, author)
        
        if ai_analysis["likely_copied"]:
            result["score"] -= 30
            result["details"].append(ai_analysis["reasoning"])
        
        if ai_analysis["suspicious_patterns"]:
            result["score"] -= 20
            result["details"].extend(ai_analysis["suspicious_patterns"])
        
        # Adjust confidence based on checks
        if result["score"] < 70:
            result["confidence"] = "low"
        elif result["score"] < 85:
            result["confidence"] = "medium"
        
        return result
    
    async def _detect_ai_content(self, text: str) -> Dict:
        """
        Detect if content is AI-generated using:
        1. Statistical analysis (perplexity, burstiness)
        2. AI-specific patterns and phrases
        3. Claude API analysis
        """
        result = {
            "score": 100,  # Start at 100 (human), deduct for AI likelihood
            "confidence": "high",
            "details": [],
            "ai_probability": 0.0
        }
        
        # Sample text for analysis
        sample = text[:8000]
        
        # Check for common AI patterns
        ai_indicators = [
            r'\bAs an AI\b',
            r'\bIn conclusion\b.*\bIn conclusion\b',  # Repetitive conclusions
            r'\bIt is important to note\b',
            r'\bIt is worth noting\b',
            r'\bDelve into\b',
            r'\bNavigate the complexities\b',
            r'\bHowever, it\'s important to consider\b'
        ]
        
        ai_pattern_count = 0
        for pattern in ai_indicators:
            if re.search(pattern, sample, re.IGNORECASE):
                ai_pattern_count += 1
        
        if ai_pattern_count >= 3:
            result["score"] -= 30
            result["ai_probability"] += 0.3
            result["details"].append(
                f"Found {ai_pattern_count} AI-common phrases"
            )
        
        # Use Claude to analyze writing style
        ai_analysis = await self._ai_analyze_content_authenticity(sample)
        
        result["ai_probability"] = max(
            result["ai_probability"], 
            ai_analysis["ai_probability"]
        )
        
        if ai_analysis["ai_probability"] > 0.7:
            result["score"] -= 50
            result["details"].append("High probability of AI generation detected")
        elif ai_analysis["ai_probability"] > 0.4:
            result["score"] -= 25
            result["details"].append("Moderate AI characteristics detected")
        
        result["details"].extend(ai_analysis["indicators"])
        
        if result["score"] < 60:
            result["confidence"] = "low"
        elif result["score"] < 80:
            result["confidence"] = "medium"
        
        return result
    
    async def _assess_quality(self, text: str, title: str) -> Dict:
        """
        Assess content quality:
        1. Grammar and spelling
        2. Coherence and structure
        3. Readability
        4. Professionalism
        """
        result = {
            "score": 85,  # Start at decent quality
            "confidence": "high",
            "details": [],
            "issues": []
        }
        
        sample = text[:6000]
        
        # Basic quality checks
        if len(text) < 10000:
            result["score"] -= 20
            result["issues"].append("Content is very short for a book")
        
        # Check for excessive typos/errors (basic heuristic)
        words = sample.split()
        if len(words) > 0:
            # Count words with multiple repeated characters (potential typos)
            typo_pattern = re.compile(r'\b\w*(.)\1{2,}\w*\b')
            typos = len(typo_pattern.findall(sample))
            typo_rate = typos / len(words)
            
            if typo_rate > 0.02:  # More than 2% unusual patterns
                result["score"] -= 15
                result["issues"].append("High rate of potential typos detected")
        
        # Use AI for quality assessment
        quality_analysis = await self._ai_assess_quality(sample, title)
        
        result["score"] = (result["score"] + quality_analysis["score"]) / 2
        result["details"].extend(quality_analysis["feedback"])
        
        return result
    
    async def _check_copyright_violations(
        self, 
        text: str, 
        title: str,
        author: str
    ) -> Dict:
        """
        Check for potential copyright violations:
        1. Known copyrighted work detection
        2. Famous book excerpts
        3. Unauthorized adaptations
        """
        result = {
            "score": 100,
            "confidence": "high",
            "details": [],
            "warnings": []
        }
        
        # Check title against known copyrighted works
        suspicious_patterns = [
            (r'harry potter', 'Potential Harry Potter content'),
            (r'lord of the rings', 'Potential LOTR content'),
            (r'game of thrones', 'Potential GoT content'),
            (r'hunger games', 'Potential Hunger Games content'),
            (r'twilight', 'Potential Twilight content'),
        ]
        
        title_lower = title.lower()
        text_sample = text[:5000].lower()
        
        for pattern, warning in suspicious_patterns:
            if re.search(pattern, title_lower) or re.search(pattern, text_sample):
                result["score"] -= 50
                result["warnings"].append(warning)
        
        # Use AI to check for derivative works
        derivative_check = await self._ai_check_derivative_work(
            text[:4000], title, author
        )
        
        if derivative_check["is_derivative"]:
            result["score"] -= 40
            result["details"].append(derivative_check["reasoning"])
        
        return result
    
    def _extract_distinctive_passages(
        self, 
        text: str, 
        count: int = 5, 
        length: int = 200
    ) -> List[str]:
        """
        Extract distinctive passages that are good for plagiarism checking
        Avoid common phrases, focus on unique content
        """
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 50]
        
        # Simple scoring: prefer longer, unique sentences
        scored = []
        for sent in sentences:
            # Score based on length and unique words
            words = sent.lower().split()
            unique_ratio = len(set(words)) / max(len(words), 1)
            score = len(sent) * unique_ratio
            scored.append((score, sent))
        
        # Get top N sentences
        scored.sort(reverse=True)
        passages = []
        
        for _, sent in scored[:count * 2]:  # Get extra in case some are too short
            if len(sent) >= length:
                passages.append(sent[:length])
            if len(passages) >= count:
                break
        
        return passages
    
    async def _search_text_online(self, text: str) -> bool:
        """
        Search for exact text matches online
        Returns True if found
        """
        try:
            # Use a simple check - in production you'd use proper plagiarism APIs
            # like Copyscape, Turnitin API, or similar
            query = text[:100]  # First 100 chars
            
            # For now, just check if it's obviously a famous quote
            famous_quotes = [
                "it was the best of times",
                "call me ishmael",
                "it is a truth universally acknowledged",
                "in the beginning",
                "happy families are all alike"
            ]
            
            query_lower = query.lower()
            for quote in famous_quotes:
                if quote in query_lower:
                    return True
            
            return False
            
        except Exception:
            return False
    
    async def _ai_analyze_originality(
        self, 
        text: str, 
        title: str,
        author: str
    ) -> Dict:
        """
        Use Claude to analyze if content appears original
        """
        try:
            prompt = f"""Analyze this book excerpt for originality and potential plagiarism.

Title: {title}
Author: {author}

Text excerpt:
{text[:3000]}

Please assess:
1. Does this appear to be original content or copied from elsewhere?
2. Are there suspicious patterns suggesting plagiarism?
3. Does the writing style seem consistent throughout?

Respond in JSON format:
{{
    "likely_copied": boolean,
    "reasoning": "explanation",
    "suspicious_patterns": ["pattern1", "pattern2"],
    "confidence": "high|medium|low"
}}"""

            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            import json
            response = message.content[0].text
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                return analysis
            
            return {
                "likely_copied": False,
                "reasoning": "Unable to analyze",
                "suspicious_patterns": [],
                "confidence": "low"
            }
            
        except Exception as e:
            return {
                "likely_copied": False,
                "reasoning": f"Analysis error: {str(e)}",
                "suspicious_patterns": [],
                "confidence": "low"
            }
    
    async def _ai_analyze_content_authenticity(self, text: str) -> Dict:
        """
        Use Claude to detect AI-generated content
        """
        try:
            prompt = f"""Analyze this text to determine if it was likely written by AI or a human.

Text:
{text[:4000]}

Consider:
1. Writing style consistency
2. Natural flow and variation
3. AI-common phrases and patterns
4. Depth of personal voice and creativity

Respond in JSON format:
{{
    "ai_probability": 0.0-1.0,
    "indicators": ["indicator1", "indicator2"],
    "reasoning": "explanation"
}}"""

            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            import json
            response = message.content[0].text
            
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                return analysis
            
            return {
                "ai_probability": 0.0,
                "indicators": [],
                "reasoning": "Unable to analyze"
            }
            
        except Exception:
            return {
                "ai_probability": 0.0,
                "indicators": [],
                "reasoning": "Analysis failed"
            }
    
    async def _ai_assess_quality(self, text: str, title: str) -> Dict:
        """
        Use Claude to assess content quality
        """
        try:
            prompt = f"""Assess the quality of this book excerpt.

Title: {title}

Text:
{text[:3000]}

Rate the following (0-100):
1. Grammar and spelling
2. Narrative coherence
3. Writing style
4. Overall professionalism

Respond in JSON format:
{{
    "score": 0-100,
    "feedback": ["point1", "point2"],
    "strengths": ["strength1"],
    "improvements": ["improvement1"]
}}"""

            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            import json
            response = message.content[0].text
            
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                return analysis
            
            return {
                "score": 70,
                "feedback": ["Unable to analyze fully"],
                "strengths": [],
                "improvements": []
            }
            
        except Exception:
            return {
                "score": 70,
                "feedback": ["Analysis failed"],
                "strengths": [],
                "improvements": []
            }
    
    async def _ai_check_derivative_work(
        self, 
        text: str, 
        title: str,
        author: str
    ) -> Dict:
        """
        Check if content is an unauthorized derivative work
        """
        try:
            prompt = f"""Analyze if this book appears to be a derivative work or fanfiction of existing copyrighted material.

Title: {title}
Author: {author}

Text:
{text[:3000]}

Look for:
1. Characters/settings from known works
2. Unauthorized adaptations
3. Fanfiction patterns

Respond in JSON format:
{{
    "is_derivative": boolean,
    "reasoning": "explanation",
    "potential_source": "work name or null"
}}"""

            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            import json
            response = message.content[0].text
            
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                return analysis
            
            return {
                "is_derivative": False,
                "reasoning": "Unable to determine",
                "potential_source": None
            }
            
        except Exception:
            return {
                "is_derivative": False,
                "reasoning": "Analysis failed",
                "potential_source": None
            }
    
    def _calculate_overall_score(self, checks: Dict) -> float:
        """
        Calculate overall verification score from all checks
        Weighted average based on importance
        """
        weights = {
            "plagiarism": 0.35,      # Most important
            "copyright": 0.30,        # Very important
            "ai_detection": 0.20,     # Important
            "quality": 0.15           # Least critical
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for check_name, weight in weights.items():
            if check_name in checks:
                total_score += checks[check_name]["score"] * weight
                total_weight += weight
        
        if total_weight > 0:
            return total_score / total_weight
        
        return 0.0


# Global service instance
verification_service = ContentVerificationService()
