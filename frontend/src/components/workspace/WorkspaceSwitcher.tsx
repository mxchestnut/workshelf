/**
 * WorkspaceSwitcher - Dropdown to switch between workspaces
 */

import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { WorkspaceType } from '../../types/workspace';
import CreateWorkspaceModal from './CreateWorkspaceModal';

const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getWorkspaceIcon = (type: WorkspaceType) => {
    switch (type) {
      case 'personal':
        return '👤';
      case 'team':
        return '👥';
      case 'project':
        return '📁';
      default:
        return '📂';
    }
  };

  const handleSelectWorkspace = (workspace: typeof currentWorkspace) => {
    setCurrentWorkspace(workspace);
    setIsOpen(false);
  };

  if (isLoading) {
    return <div className="px-4 py-2 text-gray-500">Loading...</div>;
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-lg">{currentWorkspace ? getWorkspaceIcon(currentWorkspace.type) : '📂'}</span>
          <span className="font-medium">{currentWorkspace?.name || 'Select Workspace'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
              <div className="py-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace)}
                    className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                      currentWorkspace?.id === workspace.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-lg">{getWorkspaceIcon(workspace.type)}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{workspace.name}</div>
                      {workspace.description && (
                        <div className="text-xs text-gray-500 truncate">{workspace.description}</div>
                      )}
                    </div>
                    {currentWorkspace?.id === workspace.id && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Create New Workspace</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateWorkspaceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </>
  );
};

export default WorkspaceSwitcher;
