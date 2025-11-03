"""
AI Assistance Service
AI is available for prompts, brainstorming, and creative support
BUT NOT for generating the actual writing content

This service provides AI tools that HELP writers create, but never write FOR them.
Uses Claude (Anthropic) API for creative writing assistance.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import os


class AIAssistanceService:
    """
    AI tools to help writers in their creative process
    
    Allowed AI Features:
    - Writing prompts generation
    - Character development questions
    - Plot brainstorming
    - World-building suggestions
    - Title suggestions
    - Outline structure help
    - Grammar/style analysis (not rewriting)
    - Synonym suggestions (single words only)
    
    PROHIBITED AI Features:
    - Generating paragraphs or full sentences
    - Rewriting user content
    - Completing unfinished work
    - "Continue this story" features
    - Auto-complete beyond single words
    """
    
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-4-sonnet-20250514")  # Claude 4 Sonnet (newest, best for creative writing)
    
    @staticmethod
    async def _call_claude(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        """
        Helper method to call Claude API
        
        Args:
            system_prompt: System instructions for Claude
            user_prompt: User's request
            max_tokens: Maximum tokens in response
            
        Returns:
            Claude's response text
        """
        if not AIAssistanceService.ANTHROPIC_API_KEY:
            # Return mock data if API key not configured
            return "API key not configured. Using mock data."
        
        try:
            from anthropic import AsyncAnthropic
            
            client = AsyncAnthropic(api_key=AIAssistanceService.ANTHROPIC_API_KEY)
            
            message = await client.messages.create(
                model=AIAssistanceService.CLAUDE_MODEL,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return message.content[0].text
        except Exception as e:
            # Fallback to mock data on error
            return f"Error calling Claude API: {str(e)}. Using fallback data."
    
    @staticmethod
    async def generate_writing_prompts(
        genre: Optional[str] = None,
        theme: Optional[str] = None,
        count: int = 5
    ) -> Dict[str, Any]:
        """
        Generate writing prompts to inspire the writer
        
        Returns ideas/questions, NOT actual writing
        """
        # If Claude API is configured, use it for enhanced prompts
        if AIAssistanceService.ANTHROPIC_API_KEY:
            system_prompt = """You are a creative writing assistant. Generate writing prompts that INSPIRE writers to create their own stories.

IMPORTANT: Generate prompts as IDEAS and QUESTIONS only. Never write actual story content, paragraphs, or scenes.

Each prompt should be a scenario, question, or concept that sparks creativity."""

            user_prompt = f"""Generate {count} creative writing prompts.
Genre: {genre or 'any'}
Theme: {theme or 'any'}

Format as a list of prompts. Each should be 1-2 sentences that spark ideas without writing the story."""

            try:
                response = await AIAssistanceService._call_claude(system_prompt, user_prompt, max_tokens=1500)
                
                return {
                    "prompts_text": response,
                    "genre": genre,
                    "theme": theme,
                    "source": "claude",
                    "note": "These are IDEAS to inspire YOUR writing. The actual story is yours to create."
                }
            except Exception:
                pass  # Fall through to default prompts
        
        # Default/fallback prompts (used if API not configured or fails)
        prompts = [
            {
                "prompt": "What if your protagonist discovered they were living in a simulation?",
                "type": "scenario",
                "theme": theme or "mystery"
            },
            {
                "prompt": "Write about a character who can only tell the truth in writing",
                "type": "character_concept",
                "theme": theme or "drama"
            },
            {
                "prompt": "A world where emotions are currency - what would people trade?",
                "type": "world_building",
                "theme": theme or "fantasy"
            },
            {
                "prompt": "Your character finds a letter addressed to them from 50 years in the future",
                "type": "scenario",
                "theme": theme or "sci-fi"
            },
            {
                "prompt": "Describe a society where music is forbidden",
                "type": "world_building",
                "theme": theme or "dystopian"
            }
        ]
        
        return {
            "prompts": prompts[:count],
            "genre": genre,
            "theme": theme,
            "note": "These are IDEAS to inspire YOUR writing. The actual story is yours to create."
        }
    
    @staticmethod
    async def brainstorm_character(
        character_type: str,
        genre: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate character development QUESTIONS (not character descriptions)
        
        Returns questions the writer should answer, not pre-made characters
        """
        questions = [
            "What does this character want more than anything?",
            "What are they willing to sacrifice to get it?",
            "What's their biggest fear?",
            "What lie do they believe about themselves?",
            "What's a secret they've never told anyone?",
            "How do they react under pressure?",
            "What's their relationship with their family?",
            "What makes them laugh?",
            "What would make them cry?",
            "What's their moral line they won't cross?"
        ]
        
        return {
            "character_type": character_type,
            "genre": genre,
            "development_questions": questions,
            "note": "Answer these questions to develop YOUR unique character. Don't let AI answer for you!"
        }
    
    @staticmethod
    async def suggest_plot_points(
        story_premise: str,
        act: str = "all"  # "one", "two", "three", "all"
    ) -> Dict[str, Any]:
        """
        Suggest TYPES of plot points, not actual plot
        
        Returns structural suggestions, not story content
        """
        suggestions = {
            "act_one": [
                "Establish the ordinary world",
                "Introduce the inciting incident",
                "Show the protagonist's initial reaction",
                "Present the first obstacle"
            ],
            "act_two": [
                "Raise the stakes",
                "Introduce a major setback",
                "Reveal a key piece of information",
                "Challenge the protagonist's beliefs"
            ],
            "act_three": [
                "Force the final decision",
                "Bring all conflicts to a head",
                "Show the transformation",
                "Resolve the central question"
            ]
        }
        
        return {
            "story_premise": story_premise,
            "structure_suggestions": suggestions if act == "all" else {act: suggestions.get(f"act_{act}", [])},
            "note": "These are STRUCTURAL guidelines. Fill them with YOUR unique story!"
        }
    
    @staticmethod
    async def analyze_pacing(
        content: str,
        word_count: int
    ) -> Dict[str, Any]:
        """
        Analyze pacing and rhythm (ANALYSIS ONLY, no rewriting)
        
        Returns metrics and observations, not corrections
        """
        # Simple pacing analysis
        sentences = content.count('.') + content.count('!') + content.count('?')
        avg_sentence_length = word_count / sentences if sentences > 0 else 0
        
        paragraphs = content.count('\n\n') + 1
        avg_paragraph_length = word_count / paragraphs if paragraphs > 0 else 0
        
        # Analyze dialogue vs narrative
        dialogue_markers = content.count('"') + content.count("'")
        dialogue_percentage = (dialogue_markers / (word_count * 2)) * 100 if word_count > 0 else 0
        
        observations = []
        if avg_sentence_length > 25:
            observations.append({
                "type": "sentence_length",
                "observation": "Your sentences average over 25 words. This creates a slower, more contemplative pace.",
                "suggestion": "Consider varying sentence length for rhythm. Short sentences create urgency."
            })
        elif avg_sentence_length < 10:
            observations.append({
                "type": "sentence_length",
                "observation": "Your sentences average under 10 words. This creates a fast, punchy pace.",
                "suggestion": "Consider adding some longer sentences for depth and complexity."
            })
        
        if dialogue_percentage > 50:
            observations.append({
                "type": "dialogue",
                "observation": "Your text is over 50% dialogue. This creates a conversational, fast-moving feel.",
                "suggestion": "Balance with narrative description to ground the reader in the scene."
            })
        
        return {
            "metrics": {
                "total_words": word_count,
                "total_sentences": sentences,
                "avg_sentence_length": round(avg_sentence_length, 1),
                "paragraphs": paragraphs,
                "avg_paragraph_length": round(avg_paragraph_length, 1),
                "dialogue_percentage": round(dialogue_percentage, 1)
            },
            "observations": observations,
            "note": "These are observations about YOUR writing. Keep your unique voice!"
        }
    
    @staticmethod
    async def suggest_synonyms(
        word: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Suggest synonyms for a SINGLE WORD only
        
        Returns word alternatives, not sentence rewrites
        """
        # Simple synonym suggestions (would use a proper thesaurus API in production)
        common_synonyms = {
            "said": ["whispered", "shouted", "murmured", "declared", "announced"],
            "walked": ["strolled", "marched", "wandered", "strode", "ambled"],
            "looked": ["glanced", "stared", "gazed", "peered", "observed"],
            "happy": ["joyful", "elated", "content", "delighted", "pleased"],
            "sad": ["melancholy", "dejected", "sorrowful", "gloomy", "downcast"]
        }
        
        suggestions = common_synonyms.get(word.lower(), [])
        
        return {
            "word": word,
            "synonyms": suggestions,
            "context": context,
            "note": "Choose the word that fits YOUR voice and intent. No word is universally better."
        }
    
    @staticmethod
    async def generate_title_ideas(
        theme: str,
        genre: str,
        keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Suggest title ideas based on theme and genre
        
        Returns title suggestions, writer makes final choice
        """
        # Example titles (would generate more creative ones with AI in production)
        title_patterns = [
            f"The {keywords[0] if keywords else 'Last'} {genre.title()}",
            f"{theme.title()}: A {genre.title()} Story",
            f"Beyond {keywords[0] if keywords else 'Tomorrow'}",
            f"The {theme.title()} Chronicles"
        ]
        
        return {
            "theme": theme,
            "genre": genre,
            "keywords": keywords,
            "suggestions": title_patterns,
            "note": "These are starting points. Personalize them to match YOUR story!"
        }
    
    @staticmethod
    async def create_outline_structure(
        story_type: str,  # "novel", "short_story", "novella", "screenplay"
        acts: int = 3
    ) -> Dict[str, Any]:
        """
        Provide empty outline structure (FRAMEWORK ONLY)
        
        Returns blank structure for writer to fill, not a completed outline
        """
        structures = {
            "novel": {
                "act_one": {
                    "chapters": 8,
                    "key_beats": [
                        "Opening image",
                        "Introduce protagonist in their world",
                        "Inciting incident (10-15% in)",
                        "Refuse the call",
                        "Meet mentor/ally",
                        "Accept the call",
                        "Cross threshold into new world"
                    ]
                },
                "act_two": {
                    "chapters": 16,
                    "part_one": {
                        "key_beats": [
                            "Fun and games (promise of premise)",
                            "B-story begins",
                            "Midpoint (50% in) - false victory or defeat"
                        ]
                    },
                    "part_two": {
                        "key_beats": [
                            "Bad guys close in",
                            "All is lost (75% in)",
                            "Dark night of the soul"
                        ]
                    }
                },
                "act_three": {
                    "chapters": 6,
                    "key_beats": [
                        "Find inner strength",
                        "Gather team/resources",
                        "Final confrontation",
                        "Resolution",
                        "New equilibrium",
                        "Closing image"
                    ]
                }
            },
            "short_story": {
                "structure": [
                    "Opening - establish character and situation",
                    "Inciting incident - something changes",
                    "Rising action - complications arise",
                    "Climax - moment of truth",
                    "Resolution - new understanding"
                ]
            }
        }
        
        return {
            "story_type": story_type,
            "structure": structures.get(story_type, structures["short_story"]),
            "note": "This is an EMPTY framework. Fill it with YOUR unique story beats!"
        }
    
    @staticmethod
    def validate_ai_request(request_type: str) -> Dict[str, Any]:
        """
        Validate that AI request is for assistance, not writing generation
        
        BLOCKS requests that would generate actual content
        """
        allowed_types = [
            "writing_prompts",
            "character_questions",
            "plot_structure",
            "pacing_analysis",
            "synonym_single_word",
            "title_suggestions",
            "outline_framework",
            "world_building_questions",
            "theme_exploration"
        ]
        
        prohibited_types = [
            "generate_paragraph",
            "write_scene",
            "complete_story",
            "rewrite_content",
            "continue_writing",
            "auto_complete_sentence",
            "generate_dialogue",
            "write_description"
        ]
        
        if request_type in prohibited_types:
            return {
                "allowed": False,
                "reason": "This feature would write FOR you. Work Shelf is about YOUR authentic voice.",
                "alternative": "Try our writing prompts, character development questions, or structure tools instead!"
            }
        
        if request_type in allowed_types:
            return {
                "allowed": True,
                "message": "This tool helps you create, without replacing your creativity!"
            }
        
        return {
            "allowed": False,
            "reason": "Unknown AI request type",
            "allowed_types": allowed_types
        }
