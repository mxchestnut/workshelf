/**
 * Workspace API Types
 */

export type WorkspaceType = 'personal' | 'team' | 'project';

export type WorkspaceVisibility = 'private' | 'organization';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type CollectionStatus = 'draft' | 'review' | 'published' | 'archived';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: WorkspaceType;
  visibility: WorkspaceVisibility;
  owner_id: string;
  avatar_url: string | null;
  is_active: boolean;
  member_count: number;
  collection_count: number;
  created_at: string;
  updated_at: string;
  user_role: WorkspaceRole | null;
  current_user_role: WorkspaceRole | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  user: {
    username: string;
    email: string;
  };
  role: WorkspaceRole;
  can_create_collections: boolean;
  can_edit_workspace: boolean;
  can_manage_members: boolean;
  joined_at: string;
}

export interface WorkspaceCollection {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: CollectionStatus;
  created_by: string;
  published_at: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  type?: WorkspaceType;
  visibility?: WorkspaceVisibility;
  avatar_url?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  visibility?: WorkspaceVisibility;
  avatar_url?: string;
  is_active?: boolean;
}

export interface InviteMemberData {
  username: string;
  role: WorkspaceRole;
  can_create_collections?: boolean;
  can_edit_workspace?: boolean;
  can_manage_members?: boolean;
}

export interface UpdateMemberData {
  role?: WorkspaceRole;
  can_create_collections?: boolean;
  can_edit_workspace?: boolean;
  can_manage_members?: boolean;
}

export interface CreateCollectionData {
  name: string;
  description?: string;
  status?: CollectionStatus;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  status?: CollectionStatus;
}
