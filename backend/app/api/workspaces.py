"""
Workspace API endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCollectionCreate,
    WorkspaceCollectionResponse,
    WorkspaceCollectionUpdate,
    WorkspaceCreate,
    WorkspaceMemberInvite,
    WorkspaceMemberResponse,
    WorkspaceMemberUpdate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace."""
    workspace = await WorkspaceService.create_workspace(
        db, current_user.id, workspace_data
    )

    # Add counts
    member_count = await WorkspaceService.get_member_count(db, workspace.id)
    collection_count = await WorkspaceService.get_collection_count(db, workspace.id)

    response = WorkspaceResponse.model_validate(workspace)
    response.member_count = member_count
    response.collection_count = collection_count
    response.user_role = "owner"

    return response


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's workspaces."""
    workspaces = await WorkspaceService.list_user_workspaces(
        db, current_user.id, skip, limit
    )

    responses = []
    for workspace in workspaces:
        member_count = await WorkspaceService.get_member_count(db, workspace.id)
        collection_count = await WorkspaceService.get_collection_count(db, workspace.id)
        member = await WorkspaceService.get_member(db, workspace.id, current_user.id)

        response = WorkspaceResponse.model_validate(workspace)
        response.member_count = member_count
        response.collection_count = collection_count
        response.user_role = member.role if member else None

        responses.append(response)

    return responses


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get workspace details."""
    workspace = await WorkspaceService.get_workspace(db, workspace_id, current_user.id)
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found"
        )

    member_count = await WorkspaceService.get_member_count(db, workspace.id)
    collection_count = await WorkspaceService.get_collection_count(db, workspace.id)
    member = await WorkspaceService.get_member(db, workspace.id, current_user.id)

    response = WorkspaceResponse.model_validate(workspace)
    response.member_count = member_count
    response.collection_count = collection_count
    response.user_role = member.role if member else None

    return response


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: int,
    workspace_data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update workspace."""
    workspace = await WorkspaceService.update_workspace(
        db, workspace_id, current_user.id, workspace_data
    )
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit workspace",
        )

    member_count = await WorkspaceService.get_member_count(db, workspace.id)
    collection_count = await WorkspaceService.get_collection_count(db, workspace.id)
    member = await WorkspaceService.get_member(db, workspace.id, current_user.id)

    response = WorkspaceResponse.model_validate(workspace)
    response.member_count = member_count
    response.collection_count = collection_count
    response.user_role = member.role if member else None

    return response


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete workspace (owner only)."""
    success = await WorkspaceService.delete_workspace(db, workspace_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete workspace",
        )


# Member management endpoints


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def list_members(
    workspace_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List workspace members."""
    # Check if user is a member
    member = await WorkspaceService.get_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace member"
        )

    members = await WorkspaceService.list_members(db, workspace_id, skip, limit)

    # Add username to response
    responses = []
    for m in members:
        response = WorkspaceMemberResponse.model_validate(m)
        if m.user:
            response.username = m.user.username
        responses.append(response)

    return responses


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    workspace_id: int,
    invite_data: WorkspaceMemberInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to workspace."""
    member = await WorkspaceService.add_member(
        db, workspace_id, current_user.id, invite_data
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add members or user already a member",
        )

    response = WorkspaceMemberResponse.model_validate(member)
    if member.user:
        response.username = member.user.username

    return response


@router.patch(
    "/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberResponse
)
async def update_member(
    workspace_id: int,
    user_id: int,
    update_data: WorkspaceMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update member permissions."""
    member = await WorkspaceService.update_member(
        db, workspace_id, user_id, current_user.id, update_data
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update member",
        )

    response = WorkspaceMemberResponse.model_validate(member)
    if member.user:
        response.username = member.user.username

    return response


@router.delete(
    "/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_member(
    workspace_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from workspace."""
    success = await WorkspaceService.remove_member(
        db, workspace_id, user_id, current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove member",
        )


# Collection endpoints


@router.post(
    "/{workspace_id}/collections",
    response_model=WorkspaceCollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_collection(
    workspace_id: int,
    collection_data: WorkspaceCollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a collection in workspace."""
    collection = await WorkspaceService.create_collection(
        db, workspace_id, current_user.id, collection_data
    )
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create collections",
        )

    response = WorkspaceCollectionResponse.model_validate(collection)
    response.item_count = 0
    return response


@router.get(
    "/{workspace_id}/collections", response_model=List[WorkspaceCollectionResponse]
)
async def list_collections(
    workspace_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List collections in workspace."""
    # Check if user is a member
    member = await WorkspaceService.get_member(db, workspace_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace member"
        )

    collections = await WorkspaceService.list_collections(db, workspace_id, skip, limit)

    responses = []
    for collection in collections:
        response = WorkspaceCollectionResponse.model_validate(collection)
        response.item_count = 0  # TODO: Implement item counting
        responses.append(response)

    return responses


@router.patch(
    "/collections/{collection_id}", response_model=WorkspaceCollectionResponse
)
async def update_collection(
    collection_id: int,
    collection_data: WorkspaceCollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a collection."""
    collection = await WorkspaceService.update_collection(
        db, collection_id, current_user.id, collection_data
    )
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update collection",
        )

    response = WorkspaceCollectionResponse.model_validate(collection)
    response.item_count = 0  # TODO: Implement item counting
    return response


@router.delete("/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection."""
    success = await WorkspaceService.delete_collection(
        db, collection_id, current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete collection",
        )
