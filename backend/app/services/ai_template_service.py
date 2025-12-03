"""
AI Template Generation Service

Uses Claude API to generate custom project templates based on user interests.
"""

import os
import time
import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ai_templates import AIGeneratedTemplate, AIGenerationLog
from app.models.templates import ProjectTemplate, TemplateSection  # TemplateInterestMapping not yet implemented


class AITemplateGenerator:
    """
    Generate custom project templates using Claude API.
    """
    
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-3-5-sonnet-20241022"  # Latest model
    
    async def generate_templates_for_interests(
        self,
        db: AsyncSession,
        interests: List[str],
        user_id: Optional[int] = None,
        group_id: Optional[int] = None,
        num_templates: int = 10
    ) -> List[AIGeneratedTemplate]:
        """
        Generate custom templates based on user interests.
        
        Args:
            db: Database session
            interests: List of user interests (e.g., ["science fiction", "worldbuilding"])
            user_id: Optional user ID who requested generation
            group_id: Optional group ID for which templates are generated
            num_templates: Number of templates to generate (default 10)
        
        Returns:
            List of AI-generated templates (saved to database with status='pending')
        """
        
        # Build the prompt for Claude
        prompt = self._build_generation_prompt(interests, num_templates)
        
        start_time = time.time()
        error_message = None
        success = True
        response_text = None
        templates = []
        
        try:
            # Call Claude API
            message = self.client.messages.create(
                model=self.model,
                max_tokens=8000,
                temperature=0.7,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Parse Claude's response (expecting JSON)
            templates_data = json.loads(response_text)
            
            # Create AIGeneratedTemplate records
            for template_data in templates_data.get("templates", []):
                template = AIGeneratedTemplate(
                    name=template_data["name"],
                    slug=self._slugify(template_data["name"]),
                    description=template_data.get("description"),
                    category=template_data.get("category"),
                    icon=template_data.get("icon", "📄"),
                    source_interests=interests,
                    ai_model=self.model,
                    ai_prompt_used=prompt,
                    sections=template_data["sections"],
                    status="pending",
                    requested_by_group=group_id
                )
                db.add(template)
                templates.append(template)
            
            await db.commit()
            
        except Exception as e:
            error_message = str(e)
            success = False
            generation_time_ms = int((time.time() - start_time) * 1000)
            await db.rollback()
        
        # Log the generation attempt
        log_entry = AIGenerationLog(
            user_id=user_id,
            group_id=group_id,
            interests=interests,
            ai_model=self.model,
            prompt_sent=prompt,
            response_received=response_text,
            templates_generated=len(templates),
            generation_time_ms=generation_time_ms,
            error_message=error_message,
            success=success
        )
        db.add(log_entry)
        await db.commit()
        
        if not success:
            raise Exception(f"Failed to generate templates: {error_message}")
        
        return templates
    
    def _build_generation_prompt(self, interests: List[str], num_templates: int) -> str:
        """
        Build the prompt for Claude to generate templates.
        """
        interests_str = ", ".join(interests)
        
        return f"""You are an expert project template designer. A user is creating a collaborative workspace with these interests: {interests_str}

Generate {num_templates} custom project templates that would be most useful for someone with these interests. Each template should help them organize and develop their creative or professional projects.

For each template:
1. Choose a clear, specific name
2. Write a 1-2 sentence description
3. Assign a category (creative, business, academic, technical, gaming, or other)
4. Suggest an emoji icon
5. Create a hierarchical section structure (2-6 top-level sections)
6. For each section, provide 2-4 AI prompts that help users fill it out

AI Prompts should:
- Ask insightful questions that spark creativity
- Help users think through important details
- Be specific to the context (not generic)
- Support different input types: short_text, long_text, list, or brainstorm

Return your response as JSON in this exact format:
{{
  "templates": [
    {{
      "name": "Template Name",
      "description": "What this template helps with",
      "category": "creative|business|academic|technical|gaming|other",
      "icon": "📖",
      "sections": [
        {{
          "title": "Section Name",
          "description": "What goes in this section",
          "order_index": 1,
          "ai_prompts": [
            {{
              "id": "prompt1",
              "question": "What is your...",
              "type": "short_text|long_text|list|brainstorm",
              "help_text": "Optional guidance",
              "placeholder": "Example answer..."
            }}
          ],
          "children": [
            {{
              "title": "Subsection Name",
              "description": "Details",
              "order_index": 1,
              "ai_prompts": [...]
            }}
          ]
        }}
      ]
    }}
  ]
}}

Make the templates highly relevant to: {interests_str}
Be creative and think about what would genuinely help this user succeed with their projects."""
    
    def _slugify(self, text: str) -> str:
        """
        Convert text to URL-friendly slug.
        """
        import re
        slug = text.lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        return slug
    
    async def check_existing_templates(
        self,
        db: AsyncSession,
        interests: List[str],
        status: str = "approved"
    ) -> List[ProjectTemplate]:
        """
        Check if we already have approved templates for these interests.
        Returns matching templates sorted by relevance.
        """
        
        # Find approved AI templates with overlapping interests
        result = await db.execute(
            select(AIGeneratedTemplate)
            .where(AIGeneratedTemplate.status == status)
            .where(AIGeneratedTemplate.source_interests.overlap(interests))
        )
        ai_templates = result.scalars().all()
        
        # Get the linked ProjectTemplate records
        template_ids = [t.approved_template_id for t in ai_templates if t.approved_template_id]
        
        if not template_ids:
            return []
        
        result = await db.execute(
            select(ProjectTemplate)
            .where(ProjectTemplate.id.in_(template_ids))
            .where(ProjectTemplate.is_active == True)
        )
        
        return result.scalars().all()
    
    async def approve_template(
        self,
        db: AsyncSession,
        ai_template_id: int,
        reviewer_id: int,
        edits: Optional[Dict[str, Any]] = None,
        review_notes: Optional[str] = None
    ) -> ProjectTemplate:
        """
        Approve an AI-generated template and convert it to a canonical ProjectTemplate.
        
        Args:
            db: Database session
            ai_template_id: ID of the AI-generated template to approve
            reviewer_id: User ID of the reviewer (Kit)
            edits: Optional edits to the template structure
            review_notes: Optional notes from reviewer
        
        Returns:
            The newly created ProjectTemplate
        """
        
        # Get the AI template
        result = await db.execute(
            select(AIGeneratedTemplate).where(AIGeneratedTemplate.id == ai_template_id)
        )
        ai_template = result.scalar_one_or_none()
        
        if not ai_template:
            raise ValueError(f"AI template {ai_template_id} not found")
        
        # Create the canonical ProjectTemplate
        project_template = ProjectTemplate(
            name=ai_template.name,
            slug=ai_template.slug,
            description=ai_template.description,
            category=ai_template.category,
            icon=ai_template.icon,
            is_active=True,
            sort_order=0,
            usage_count=ai_template.groups_using
        )
        db.add(project_template)
        await db.flush()  # Get the ID
        
        # Use edited sections if provided, otherwise use original
        sections_data = edits.get("sections") if edits else ai_template.sections
        
        # Create TemplateSection records
        await self._create_sections_from_data(db, project_template.id, sections_data)
        
        # Create interest mappings
        # TODO: Implement TemplateInterestMapping model
        # for interest in ai_template.source_interests:
        #     mapping = TemplateInterestMapping(
        #         template_id=project_template.id,
        #         interest=interest.lower(),
        #         relevance_score=1.0
        #     )
        #     db.add(mapping)
        
        # Update the AI template record
        from datetime import datetime, timezone
        ai_template.status = "approved"
        ai_template.reviewed_by = reviewer_id
        ai_template.reviewed_at = datetime.now(timezone.utc)
        ai_template.review_notes = review_notes
        ai_template.approved_template_id = project_template.id
        
        if edits:
            ai_template.edited_sections = edits
        
        await db.commit()
        
        return project_template
    
    async def _create_sections_from_data(
        self,
        db: AsyncSession,
        template_id: int,
        sections_data: List[Dict[str, Any]],
        parent_id: Optional[int] = None
    ):
        """
        Recursively create TemplateSection records from JSON data.
        """
        for section_data in sections_data:
            section = TemplateSection(
                template_id=template_id,
                parent_section_id=parent_id,
                title=section_data["title"],
                description=section_data.get("description"),
                order_index=section_data.get("order_index", 0),
                ai_prompts=section_data.get("ai_prompts", [])
            )
            db.add(section)
            await db.flush()  # Get the ID for children
            
            # Recursively create children
            if "children" in section_data and section_data["children"]:
                await self._create_sections_from_data(
                    db, template_id, section_data["children"], section.id
                )
