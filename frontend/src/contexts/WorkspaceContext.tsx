/**
 * Workspace Context - Global workspace state management
 */

import { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import type { Workspace } from '../types/workspace';
import { workspaceApi } from '../services/workspaceApi';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (data: any) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: any) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await workspaceApi.list();
      setWorkspaces(data);

      // Set current workspace to first personal workspace or first workspace
      if (!currentWorkspace && data.length > 0) {
        const personalWorkspace = data.find((w) => w.type === 'personal');
        setCurrentWorkspace(personalWorkspace || data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace]);

  const createWorkspace = useCallback(async (data: any): Promise<Workspace> => {
    const workspace = await workspaceApi.create(data);
    setWorkspaces((prev) => [...prev, workspace]);
    return workspace;
  }, []);

  const updateWorkspace = useCallback(async (workspaceId: string, data: any): Promise<Workspace> => {
    const updated = await workspaceApi.update(workspaceId, data);
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? updated : w)));
    if (currentWorkspace?.id === workspaceId) {
      setCurrentWorkspace(updated);
    }
    return updated;
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    await workspaceApi.delete(workspaceId);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (currentWorkspace?.id === workspaceId) {
      setCurrentWorkspace(workspaces.find((w) => w.id !== workspaceId) || null);
    }
  }, [currentWorkspace, workspaces]);

  // Load workspaces when user changes
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const contextValue = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      isLoading,
      error,
      setCurrentWorkspace,
      refreshWorkspaces,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
    }),
    [workspaces, currentWorkspace, isLoading, error, refreshWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}
