import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { useAuth } from "../contexts/AuthContext";
import { Settings, Users, Lock, Shield, Globe, ArrowLeft, Save } from 'lucide-react';

interface Group {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
}

interface GroupMember {
  user_id: string;
  username: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  created_at: string;
}

export default function GroupSettings() {
  const { user, login, logout } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'privacy' | 'roles'>('general');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [initialIsPublic, setInitialIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const groupId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (groupId) {
      loadUser();
      loadGroup();
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadUser = async () => {
    // User loading logic removed - placeholder function
    return Promise.resolve()
  };

  const loadGroup = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
        setName(data.name);
        setDescription(data.description || '');
        setIsPublic(data.is_public);
        setInitialIsPublic(data.is_public);
        setIsActive(data.is_active);
      }
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handlePrivacyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    
    // If changing from public to private, show confirmation
    if (initialIsPublic && !newValue) {
      const confirmed = window.confirm(
        '⚠️ Warning: Making this group private is permanent.\n\n' +
        'Once a group is private, it cannot be made public again. This protects the privacy of members who join with the expectation that content will remain private.\n\n' +
        'Do you want to continue?'
      );
      if (confirmed) {
        setIsPublic(newValue);
      }
    } else {
      setIsPublic(newValue);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          visibility: isPublic ? 'public' : 'private'
        })
      });
      
      if (response.ok) {
        alert('Settings saved successfully!');
        loadGroup();
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        loadMembers();
        alert('Role updated successfully!');
      } else {
        alert('Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          user={user}
          onLogin={() => login()} onLogout={() => logout()}
         
          currentPage="groups"
        />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          user={user}
          onLogin={() => login()} onLogout={() => logout()}
         
          currentPage="groups"
        />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Group not found</h2>
            <button
              onClick={() => window.location.href = '/groups'}
              className="mt-4 text-gray-600 hover:text-gray-900"
            >
              Go back to groups
            </button>
          </div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user}
        onLogin={() => login()} onLogout={() => logout()}
       
        currentPage="groups"
      />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = `/groups/${group?.slug}`}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Group
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Group Settings</h1>
              <p className="mt-1 text-sm text-gray-500">{group.name}</p>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-5 w-5 inline mr-2" />
              General
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline mr-2" />
              Members & Roles
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'privacy'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lock className="h-5 w-5 inline mr-2" />
              Privacy & Visibility
            </button>
            <button
              onClick={() => window.location.href = `/groups/${groupId}/roles`}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
            >
              <Shield className="h-5 w-5 inline mr-2" />
              Roles & Permissions
            </button>
          </nav>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">General Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900"
                  placeholder="Describe your group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Slug
                </label>
                <input
                  type="text"
                  value={group.slug}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Slug cannot be changed after creation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members & Roles */}
        {activeTab === 'members' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Members & Roles</h2>
            
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{member.username}</p>
                      <p className="text-sm text-gray-500">Joined {new Date(member.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      member.role === 'owner' ? 'bg-yellow-100 text-yellow-800' :
                      member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      member.role === 'moderator' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role === 'owner' && <Shield className="h-4 w-4 mr-1" />}
                      {member.role === 'admin' && <Shield className="h-4 w-4 mr-1" />}
                      {member.role === 'moderator' && <Shield className="h-4 w-4 mr-1" />}
                      {member.role.toUpperCase()}
                    </span>
                    
                    {member.role !== 'owner' && (
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-gray-900 focus:border-gray-900"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy & Visibility */}
        {activeTab === 'privacy' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Privacy & Visibility</h2>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={handlePrivacyChange}
                    disabled={!isPublic}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`ml-2 text-sm ${!isPublic ? 'text-gray-500' : 'text-gray-700'}`}>
                    <Globe className="h-4 w-4 inline mr-1" />
                    Public Group - Anyone can view and join
                  </span>
                </label>
                <p className="mt-2 ml-6 text-sm text-gray-500">
                  If unchecked, group will be private and require approval to join
                </p>
                {!isPublic && (
                  <div className="mt-3 ml-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">⚠️ Privacy Protection:</span> This group is private and cannot be made public again. This protects the privacy of members who joined thinking the content would remain private.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Active Group - Group is accepting new members
                  </span>
                </label>
                <p className="mt-2 ml-6 text-sm text-gray-500">
                  If unchecked, group will be archived and no new members can join
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  );
}
