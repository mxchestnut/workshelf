/**
 * Workspace API Service
 */

import { API_BASE_URL } from '../config/authConfig';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceCollection,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  InviteMemberData,
  UpdateMemberData,
  CreateCollectionData,
  UpdateCollectionData,
} from '../types/workspace';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// Workspace CRUD
export const workspaceApi = {
  async list(): Promise<Workspace[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch workspaces');
    return response.json();
  },

  async get(workspaceId: string): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch workspace');
    return response.json();
  },

  async create(data: CreateWorkspaceData): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create workspace');
    return response.json();
  },

  async update(workspaceId: string, data: UpdateWorkspaceData): Promise<Workspace> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update workspace');
    return response.json();
  },

  async delete(workspaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete workspace');
  },
};

// Member management
export const memberApi = {
  async list(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },

  async invite(workspaceId: string, data: InviteMemberData): Promise<WorkspaceMember> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to invite member');
    return response.json();
  },

  async update(workspaceId: string, userId: string, data: UpdateMemberData): Promise<WorkspaceMember> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update member');
    return response.json();
  },

  async remove(workspaceId: string, userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove member');
  },
};

// Collections
export const collectionApi = {
  async list(workspaceId: string): Promise<WorkspaceCollection[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/collections`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
  },

  async create(workspaceId: string, data: CreateCollectionData): Promise<WorkspaceCollection> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/collections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create collection');
    return response.json();
  },

  async update(workspaceId: string, collectionId: string, data: UpdateCollectionData): Promise<WorkspaceCollection> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/collections/${collectionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update collection');
    return response.json();
  },

  async delete(workspaceId: string, collectionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/collections/${collectionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete collection');
  },
};
