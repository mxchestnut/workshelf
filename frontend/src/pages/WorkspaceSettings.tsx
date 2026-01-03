/**
 * WorkspaceSettings - Workspace management page
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { WorkspaceVisibility } from '../types/workspace';
import { toast } from '../services/toast';
import MemberManagement from '../components/workspace/MemberManagement';
import CollectionList from '../components/workspace/CollectionList';

const WorkspaceSettings: React.FC = () => {
  const { currentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'collections'>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as WorkspaceVisibility,
  });

  useEffect(() => {
    if (currentWorkspace) {
      setFormData({
        name: currentWorkspace.name,
        description: currentWorkspace.description || '',
        visibility: currentWorkspace.visibility,
      });
    }
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspace) return;

    try {
      await updateWorkspace(currentWorkspace.id, formData);
      toast.success('Workspace updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update workspace');
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await deleteWorkspace(currentWorkspace.id);
      toast.success('Workspace deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workspace');
      setIsDeleting(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No workspace selected. Please select a workspace from the switcher.</p>
        </div>
      </div>
    );
  }

  const isOwner = currentWorkspace.current_user_role === 'owner';
  const canEdit = isOwner || currentWorkspace.current_user_role === 'admin';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{currentWorkspace.name}</h1>
        <p className="text-gray-600">{currentWorkspace.description || 'No description'}</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'collections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            Collections
          </button>
        </nav>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Workspace Details</h2>
              {canEdit && (
                <button
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Edit'}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as WorkspaceVisibility })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="private">Private</option>
                  <option value="organization">Organization</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-gray-600">Type</span>
                  <p className="font-medium capitalize">{currentWorkspace.type}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Your Role</span>
                  <p className="font-medium capitalize">{currentWorkspace.current_user_role}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Members</span>
                  <p className="font-medium">{currentWorkspace.member_count}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Collections</span>
                  <p className="font-medium">{currentWorkspace.collection_count}</p>
                </div>
              </div>
            </div>
          </div>

          {isOwner && currentWorkspace.type !== 'personal' && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-600 mb-4">
                Delete this workspace and all its collections. This action cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && <MemberManagement workspaceId={currentWorkspace.id} />}

      {activeTab === 'collections' && <CollectionList workspaceId={currentWorkspace.id} />}
    </div>
  );
};

export default WorkspaceSettings;
