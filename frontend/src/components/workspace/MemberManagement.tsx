/**
 * MemberManagement - Manage workspace members
 */

import React, { useState, useEffect, useCallback } from 'react';
import { memberApi } from '../../services/workspaceApi';
import type { WorkspaceMember } from '../../types/workspace';
import { WorkspaceRole } from '../../types/workspace';
import { toast } from '../../services/toast';

interface MemberManagementProps {
  workspaceId: string;
}

const MemberManagement: React.FC<MemberManagementProps> = ({ workspaceId }) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await memberApi.list(workspaceId);
      setMembers(data);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsInviting(true);
    try {
      await memberApi.invite(workspaceId, {
        username: inviteUsername.trim(),
        role: inviteRole,
      });
      toast.success('Member invited successfully');
      setShowInviteModal(false);
      setInviteUsername('');
      setInviteRole('viewer');
      await loadMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      await memberApi.update(workspaceId, memberId, { role: newRole });
      toast.success('Member role updated');
      await loadMembers();
    } catch (error) {
      toast.error('Failed to update member role');
    }
  };

  const handleUpdatePermissions = async (
    memberId: string,
    permission: 'can_create_collections' | 'can_edit_workspace' | 'can_manage_members',
    value: boolean
  ) => {
    try {
      await memberApi.update(workspaceId, memberId, { [permission]: value });
      toast.success('Permissions updated');
      await loadMembers();
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleRemove = async (memberId: string, username: string) => {
    if (!confirm(`Remove ${username} from this workspace?`)) return;

    try {
      await memberApi.remove(workspaceId, memberId);
      toast.success('Member removed');
      await loadMembers();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">Loading members...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Invite Member
          </button>
        </div>

        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{member.user.username}</p>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value as WorkspaceRole)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id, member.user.username)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={member.can_create_collections}
                    onChange={(e) => handleUpdatePermissions(member.id, 'can_create_collections', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Create collections</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={member.can_edit_workspace}
                    onChange={(e) => handleUpdatePermissions(member.id, 'can_edit_workspace', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Edit workspace</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={member.can_manage_members}
                    onChange={(e) => handleUpdatePermissions(member.id, 'can_manage_members', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Manage members</span>
                </label>
              </div>
            </div>
          ))}

          {members.length === 0 && <p className="text-gray-500 text-center py-8">No members yet</p>}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Invite Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={isInviting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isInviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemberManagement;
