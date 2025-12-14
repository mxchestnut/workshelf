"""
Roleplay service for managing roleplay projects, characters, passages, and related features.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.roleplay import (
    RoleplayProject, RoleplayCharacter, RoleplayPassage, RoleplayScene,
    LoreEntry, PassageReaction, DiceRoll
)
from app.models import Project, User, Folder
from app.schemas.roleplay import (
    RoleplayProjectCreate, RoleplayProjectUpdate,
    CharacterCreate, CharacterUpdate,
    PassageCreate, PassageUpdate,
    SceneCreate, SceneUpdate,
    LoreEntryCreate, LoreEntryUpdate,
    DiceRollRequest, PassageReactionCreate,
    CompileRequest, PassageListParams
)


class RoleplayService:
    """Service for managing roleplay projects and related data."""
    
    # ============================================================================
    # Roleplay Project Operations
    # ============================================================================
    
    @staticmethod
    async def create_roleplay_project(
        db: AsyncSession,
        data: RoleplayProjectCreate,
        user_id: int
    ) -> RoleplayProject:
        """Create a new roleplay project linked to an existing project."""
        # Verify project exists and user has access
        project_result = await db.execute(
            select(Project).where(
                and_(Project.id == data.project_id, Project.user_id == user_id)
            )
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError("Project not found or access denied")
        
        # Check if roleplay settings already exist
        existing_result = await db.execute(
            select(RoleplayProject).where(RoleplayProject.project_id == data.project_id)
        )
        if existing_result.scalar_one_or_none():
            raise ValueError("Project already has roleplay settings")
        
        # Create roleplay project
        roleplay_project = RoleplayProject(
            project_id=data.project_id,
            genre=data.genre,
            rating=data.rating,
            posting_order=data.posting_order,
            min_post_length=data.min_post_length,
            dice_system=data.dice_system,
            dice_enabled=data.dice_enabled,
            has_lore_wiki=data.has_lore_wiki,
            has_character_sheets=data.has_character_sheets,
            has_maps=data.has_maps
        )
        
        db.add(roleplay_project)
        await db.commit()
        await db.refresh(roleplay_project)
        
        # TODO: Create default folders (IC Posts, OOC, Characters, Lore, etc.)
        # This can be done in a follow-up enhancement
        
        return roleplay_project
    
    @staticmethod
    async def list_roleplay_projects(
        db: AsyncSession,
        user_id: int
    ) -> List[RoleplayProject]:
        """List all roleplay projects accessible to the user."""
        query = (
            select(RoleplayProject)
            .join(Project)
            .where(Project.user_id == user_id)
            .options(
                selectinload(RoleplayProject.project),
                selectinload(RoleplayProject.characters),
                selectinload(RoleplayProject.scenes)
            )
        )
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_roleplay_project(
        db: AsyncSession,
        project_id: int,
        user_id: Optional[int] = None
    ) -> Optional[RoleplayProject]:
        """Get roleplay project by project ID."""
        query = select(RoleplayProject).where(RoleplayProject.project_id == project_id)
        
        # Load relationships
        query = query.options(
            selectinload(RoleplayProject.project),
            selectinload(RoleplayProject.characters),
            selectinload(RoleplayProject.scenes)
        )
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_roleplay_project(
        db: AsyncSession,
        project_id: int,
        data: RoleplayProjectUpdate,
        user_id: int
    ) -> Optional[RoleplayProject]:
        """Update roleplay project settings."""
        # Get roleplay project and verify ownership
        result = await db.execute(
            select(RoleplayProject)
            .join(Project)
            .where(
                and_(
                    RoleplayProject.project_id == project_id,
                    Project.user_id == user_id
                )
            )
        )
        roleplay_project = result.scalar_one_or_none()
        
        if not roleplay_project:
            return None
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(roleplay_project, field, value)
        
        await db.commit()
        await db.refresh(roleplay_project)
        return roleplay_project
    
    # ============================================================================
    # Character Operations
    # ============================================================================
    
    @staticmethod
    async def create_character(
        db: AsyncSession,
        roleplay_id: int,
        data: CharacterCreate,
        user_id: int
    ) -> RoleplayCharacter:
        """Create a new character in a roleplay."""
        character = RoleplayCharacter(
            roleplay_id=roleplay_id,
            user_id=user_id,
            name=data.name,
            pronouns=data.pronouns,
            species=data.species,
            age=data.age,
            avatar_url=data.avatar_url,
            short_description=data.short_description,
            full_bio=data.full_bio,
            stats=data.stats,
            traits=data.traits,
            is_npc=data.is_npc
        )
        
        db.add(character)
        await db.commit()
        await db.refresh(character)
        
        # Load user relationship
        result = await db.execute(
            select(RoleplayCharacter)
            .options(selectinload(RoleplayCharacter.user))
            .where(RoleplayCharacter.id == character.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_character(
        db: AsyncSession,
        character_id: int
    ) -> Optional[RoleplayCharacter]:
        """Get character by ID."""
        result = await db.execute(
            select(RoleplayCharacter)
            .options(selectinload(RoleplayCharacter.user))
            .where(RoleplayCharacter.id == character_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_characters(
        db: AsyncSession,
        roleplay_id: int,
        user_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        is_npc: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[RoleplayCharacter]:
        """List characters in a roleplay."""
        query = select(RoleplayCharacter).options(
            selectinload(RoleplayCharacter.user)
        ).where(RoleplayCharacter.roleplay_id == roleplay_id)
        
        if user_id is not None:
            query = query.where(RoleplayCharacter.user_id == user_id)
        if is_active is not None:
            query = query.where(RoleplayCharacter.is_active == is_active)
        if is_npc is not None:
            query = query.where(RoleplayCharacter.is_npc == is_npc)
        
        query = query.order_by(RoleplayCharacter.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def update_character(
        db: AsyncSession,
        character_id: int,
        data: CharacterUpdate,
        user_id: int
    ) -> Optional[RoleplayCharacter]:
        """Update a character (owner only)."""
        result = await db.execute(
            select(RoleplayCharacter).where(
                and_(
                    RoleplayCharacter.id == character_id,
                    RoleplayCharacter.user_id == user_id
                )
            )
        )
        character = result.scalar_one_or_none()
        
        if not character:
            return None
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(character, field, value)
        
        await db.commit()
        await db.refresh(character)
        return character
    
    @staticmethod
    async def delete_character(
        db: AsyncSession,
        character_id: int,
        user_id: int
    ) -> bool:
        """Delete a character (owner only)."""
        result = await db.execute(
            select(RoleplayCharacter).where(
                and_(
                    RoleplayCharacter.id == character_id,
                    RoleplayCharacter.user_id == user_id
                )
            )
        )
        character = result.scalar_one_or_none()
        
        if not character:
            return False
        
        await db.delete(character)
        await db.commit()
        return True
    
    # ============================================================================
    # Scene Operations
    # ============================================================================
    
    @staticmethod
    async def create_scene(
        db: AsyncSession,
        roleplay_id: int,
        data: SceneCreate
    ) -> RoleplayScene:
        """Create a new scene."""
        scene = RoleplayScene(
            roleplay_id=roleplay_id,
            title=data.title,
            description=data.description,
            sequence_number=data.sequence_number,
            is_active=data.is_active
        )
        
        db.add(scene)
        await db.commit()
        await db.refresh(scene)
        return scene
    
    @staticmethod
    async def list_scenes(
        db: AsyncSession,
        roleplay_id: int
    ) -> List[RoleplayScene]:
        """List all scenes in a roleplay, ordered by sequence."""
        result = await db.execute(
            select(RoleplayScene)
            .where(RoleplayScene.roleplay_id == roleplay_id)
            .order_by(RoleplayScene.sequence_number)
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_scene(
        db: AsyncSession,
        scene_id: int,
        data: SceneUpdate
    ) -> Optional[RoleplayScene]:
        """Update a scene."""
        result = await db.execute(
            select(RoleplayScene).where(RoleplayScene.id == scene_id)
        )
        scene = result.scalar_one_or_none()
        
        if not scene:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(scene, field, value)
        
        await db.commit()
        await db.refresh(scene)
        return scene
    
    # ============================================================================
    # Passage Operations (IC Posts)
    # ============================================================================
    
    @staticmethod
    async def create_passage(
        db: AsyncSession,
        roleplay_id: int,
        data: PassageCreate,
        user_id: int
    ) -> RoleplayPassage:
        """Create a new IC passage/post."""
        # Verify character belongs to user
        char_result = await db.execute(
            select(RoleplayCharacter).where(
                and_(
                    RoleplayCharacter.id == data.character_id,
                    RoleplayCharacter.user_id == user_id
                )
            )
        )
        character = char_result.scalar_one_or_none()
        if not character:
            raise ValueError("Character not found or not owned by user")
        
        # Calculate word count (simple approximation from content length)
        word_count = len(data.content.split()) if data.content else 0
        
        # Get next sequence number
        seq_result = await db.execute(
            select(func.max(RoleplayPassage.sequence_number))
            .where(RoleplayPassage.roleplay_id == roleplay_id)
        )
        max_seq = seq_result.scalar() or 0
        
        passage = RoleplayPassage(
            roleplay_id=roleplay_id,
            scene_id=data.scene_id,
            user_id=user_id,
            character_id=data.character_id,
            content=data.content,
            word_count=word_count,
            sequence_number=max_seq + 1,
            parent_passage_id=data.parent_passage_id,
            dice_rolls=data.dice_rolls
        )
        
        db.add(passage)
        await db.commit()
        await db.refresh(passage)
        
        # Load relationships
        result = await db.execute(
            select(RoleplayPassage)
            .options(
                selectinload(RoleplayPassage.user),
                selectinload(RoleplayPassage.character)
            )
            .where(RoleplayPassage.id == passage.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def list_passages(
        db: AsyncSession,
        roleplay_id: int,
        params: PassageListParams
    ) -> List[RoleplayPassage]:
        """List passages with filtering."""
        query = select(RoleplayPassage).options(
            selectinload(RoleplayPassage.user),
            selectinload(RoleplayPassage.character),
            selectinload(RoleplayPassage.reactions)
        ).where(RoleplayPassage.roleplay_id == roleplay_id)
        
        if params.scene_id is not None:
            query = query.where(RoleplayPassage.scene_id == params.scene_id)
        if params.character_id is not None:
            query = query.where(RoleplayPassage.character_id == params.character_id)
        if params.user_id is not None:
            query = query.where(RoleplayPassage.user_id == params.user_id)
        
        # Order by
        if params.order_by == "sequence":
            query = query.order_by(RoleplayPassage.sequence_number)
        else:  # created
            query = query.order_by(RoleplayPassage.created_at.desc())
        
        query = query.limit(params.limit).offset(params.offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def update_passage(
        db: AsyncSession,
        passage_id: int,
        data: PassageUpdate,
        user_id: int
    ) -> Optional[RoleplayPassage]:
        """Update a passage (owner only)."""
        result = await db.execute(
            select(RoleplayPassage).where(
                and_(
                    RoleplayPassage.id == passage_id,
                    RoleplayPassage.user_id == user_id
                )
            )
        )
        passage = result.scalar_one_or_none()
        
        if not passage:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        if 'content' in update_data:
            passage.content = update_data['content']
            passage.word_count = len(update_data['content'].split())
            passage.is_edited = True
        
        if 'scene_id' in update_data:
            passage.scene_id = update_data['scene_id']
        if 'dice_rolls' in update_data:
            passage.dice_rolls = update_data['dice_rolls']
        
        await db.commit()
        await db.refresh(passage)
        return passage
    
    # ============================================================================
    # Passage Reaction Operations
    # ============================================================================
    
    @staticmethod
    async def add_reaction(
        db: AsyncSession,
        passage_id: int,
        data: PassageReactionCreate,
        user_id: int
    ) -> PassageReaction:
        """Add or update a reaction to a passage."""
        # Check for existing reaction
        existing_result = await db.execute(
            select(PassageReaction).where(
                and_(
                    PassageReaction.passage_id == passage_id,
                    PassageReaction.user_id == user_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Update existing reaction
            existing.reaction_type = data.reaction_type
            await db.commit()
            await db.refresh(existing)
            reaction = existing
        else:
            # Create new reaction
            reaction = PassageReaction(
                passage_id=passage_id,
                user_id=user_id,
                reaction_type=data.reaction_type
            )
            db.add(reaction)
            
            # Update denormalized count
            passage_result = await db.execute(
                select(RoleplayPassage).where(RoleplayPassage.id == passage_id)
            )
            passage = passage_result.scalar_one_or_none()
            if passage:
                passage.reaction_count += 1
            
            await db.commit()
            await db.refresh(reaction)
        
        # Load user relationship
        result = await db.execute(
            select(PassageReaction)
            .options(selectinload(PassageReaction.user))
            .where(PassageReaction.id == reaction.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def remove_reaction(
        db: AsyncSession,
        passage_id: int,
        user_id: int
    ) -> bool:
        """Remove user's reaction from a passage."""
        result = await db.execute(
            select(PassageReaction).where(
                and_(
                    PassageReaction.passage_id == passage_id,
                    PassageReaction.user_id == user_id
                )
            )
        )
        reaction = result.scalar_one_or_none()
        
        if not reaction:
            return False
        
        # Update denormalized count
        passage_result = await db.execute(
            select(RoleplayPassage).where(RoleplayPassage.id == passage_id)
        )
        passage = passage_result.scalar_one_or_none()
        if passage and passage.reaction_count > 0:
            passage.reaction_count -= 1
        
        await db.delete(reaction)
        await db.commit()
        return True
    
    # ============================================================================
    # Lore Entry Operations
    # ============================================================================
    
    @staticmethod
    async def create_lore_entry(
        db: AsyncSession,
        roleplay_id: int,
        data: LoreEntryCreate,
        user_id: int
    ) -> LoreEntry:
        """Create a new lore entry."""
        lore_entry = LoreEntry(
            roleplay_id=roleplay_id,
            author_id=user_id,
            title=data.title,
            category=data.category,
            content=data.content,
            tags=data.tags,
            is_public=data.is_public
        )
        
        db.add(lore_entry)
        await db.commit()
        await db.refresh(lore_entry)
        
        # Load author relationship
        result = await db.execute(
            select(LoreEntry)
            .options(selectinload(LoreEntry.author))
            .where(LoreEntry.id == lore_entry.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def list_lore_entries(
        db: AsyncSession,
        roleplay_id: int,
        category: Optional[str] = None,
        author_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        is_public: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[LoreEntry]:
        """List lore entries with filtering."""
        query = select(LoreEntry).options(
            selectinload(LoreEntry.author)
        ).where(LoreEntry.roleplay_id == roleplay_id)
        
        if category is not None:
            query = query.where(LoreEntry.category == category)
        if author_id is not None:
            query = query.where(LoreEntry.author_id == author_id)
        if is_public is not None:
            query = query.where(LoreEntry.is_public == is_public)
        if tags:
            # Filter by tags (PostgreSQL array contains)
            for tag in tags:
                query = query.where(LoreEntry.tags.contains([tag]))
        
        query = query.order_by(LoreEntry.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def update_lore_entry(
        db: AsyncSession,
        lore_id: int,
        data: LoreEntryUpdate,
        user_id: int
    ) -> Optional[LoreEntry]:
        """Update a lore entry (author only)."""
        result = await db.execute(
            select(LoreEntry).where(
                and_(
                    LoreEntry.id == lore_id,
                    LoreEntry.author_id == user_id
                )
            )
        )
        lore_entry = result.scalar_one_or_none()
        
        if not lore_entry:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lore_entry, field, value)
        
        await db.commit()
        await db.refresh(lore_entry)
        return lore_entry
    
    @staticmethod
    async def delete_lore_entry(
        db: AsyncSession,
        lore_id: int,
        user_id: int
    ) -> bool:
        """Delete a lore entry (author only)."""
        result = await db.execute(
            select(LoreEntry).where(
                and_(
                    LoreEntry.id == lore_id,
                    LoreEntry.author_id == user_id
                )
            )
        )
        lore_entry = result.scalar_one_or_none()
        
        if not lore_entry:
            return False
        
        await db.delete(lore_entry)
        await db.commit()
        return True
    
    # ============================================================================
    # Dice Roll Operations
    # ============================================================================
    
    @staticmethod
    async def roll_dice(
        db: AsyncSession,
        roleplay_id: int,
        data: DiceRollRequest,
        user_id: int
    ) -> DiceRoll:
        """Execute a dice roll and store the result."""
        import random
        import re
        
        # Parse dice expression (e.g., "2d6+3")
        # Basic implementation - can be enhanced with proper dice parser
        expression = data.roll_expression.lower().replace(' ', '')
        
        # Extract all dice rolls (XdY)
        dice_pattern = r'(\d+)d(\d+)'
        matches = re.findall(dice_pattern, expression)
        
        individual_rolls = []
        total = 0
        
        for num_dice, die_size in matches:
            num_dice = int(num_dice)
            die_size = int(die_size)
            rolls = [random.randint(1, die_size) for _ in range(num_dice)]
            individual_rolls.extend(rolls)
            total += sum(rolls)
        
        # Handle modifiers (+3, -2, etc.)
        modifier_pattern = r'([+-]\d+)'
        modifiers = re.findall(modifier_pattern, expression)
        for mod in modifiers:
            total += int(mod)
        
        dice_roll = DiceRoll(
            roleplay_id=roleplay_id,
            user_id=user_id,
            character_id=data.character_id,
            roll_expression=data.roll_expression,
            result=total,
            individual_rolls=individual_rolls,
            reason=data.reason
        )
        
        db.add(dice_roll)
        await db.commit()
        await db.refresh(dice_roll)
        
        # Load relationships
        result = await db.execute(
            select(DiceRoll)
            .options(
                selectinload(DiceRoll.user),
                selectinload(DiceRoll.character)
            )
            .where(DiceRoll.id == dice_roll.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def list_dice_rolls(
        db: AsyncSession,
        roleplay_id: int,
        character_id: Optional[int] = None,
        limit: int = 50
    ) -> List[DiceRoll]:
        """List recent dice rolls."""
        query = select(DiceRoll).options(
            selectinload(DiceRoll.user),
            selectinload(DiceRoll.character)
        ).where(DiceRoll.roleplay_id == roleplay_id)
        
        if character_id is not None:
            query = query.where(DiceRoll.character_id == character_id)
        
        query = query.order_by(DiceRoll.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
