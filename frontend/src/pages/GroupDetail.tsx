import { useState, useEffect } from 'react';
import { Users, MessageSquare, Crown, Shield, ArrowLeft } from 'lucide-react';
import { GroupActionButtons } from '../components/GroupActionButtons';
import { PostModerationActions } from '../components/PostModerationActions';

interface Group {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar_url?: string;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  matrix_space_id?: string | null;
}

interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
    username?: string;
  };
}

interface GroupPost {
  id: number;
  group_id: number;
  author_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: number;
    email: string;
    username?: string;
  };
}

export default function GroupDetail() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');
  const [isMemb, setIsMember] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<{
    can_pin_posts?: boolean;
    can_delete_posts?: boolean;
    can_lock_threads?: boolean;
  }>({});
  
  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  
  // Create room modal
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);

  const groupId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMembers();
      loadPosts();
      loadFollowStatus();
      loadFollowerCount();
      loadUserProfile();
    }
  }, [groupId]);

  useEffect(() => {
    calculateUserPermissions();
  }, [members, currentUserId]);

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
        
        // Check if current user is a member
        const currentUserEmail = localStorage.getItem('userEmail');
        const isMember = data.some((m: GroupMember) => m.user?.email === currentUserEmail);
        setIsMember(isMember);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const loadFollowStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/is-following`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.is_following || false);
      }
    } catch (error) {
      console.error('Failed to load follow status:', error);
    }
  };

  const loadFollowerCount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/followers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFollowerCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      console.error('Failed to load follower count:', error);
    }
  };

  const createPost = async () => {
    if (!newPostTitle || !newPostContent) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/groups/${groupId}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent
        })
      });
      
      if (response.ok) {
        setShowNewPost(false);
        setNewPostTitle('');
        setNewPostContent('');
        loadPosts();
      } else {
        const error = await response.json();
        alert(`Failed to create post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const calculateUserPermissions = () => {
    if (!members || !currentUserId) return;
    
    const currentMember = members.find(m => m.user_id === currentUserId);
    if (!currentMember) return;

    // Base role permissions (simplified - in reality you'd fetch from custom roles)
    const basePermissions: Record<string, any> = {
      owner: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
      admin: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
      moderator: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
      member: {}
    };

    setUserPermissions(basePermissions[currentMember.role] || {});
  };

  const togglePostPin = async (postId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/group-admin/groups/${groupId}/posts/${postId}/pin`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        loadPosts(); // Reload to show updated pin status
      } else {
        const error = await response.json();
        alert(`Failed to pin/unpin post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      alert('Failed to toggle pin');
    }
  };

  const togglePostLock = async (postId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/group-admin/groups/${groupId}/posts/${postId}/lock`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        loadPosts(); // Reload to show updated lock status
      } else {
        const error = await response.json();
        alert(`Failed to lock/unlock post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
      alert('Failed to toggle lock');
    }
  };

  const createRoomInSpace = async () => {
    if (!newRoomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    setCreatingRoom(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/matrix/create-room-in-space`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            group_id: Number(groupId),
            room_name: newRoomName.trim(),
            room_topic: newRoomTopic.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Room "${data.room_name}" created successfully! Members can see it in Element.`);
        setShowCreateRoom(false);
        setNewRoomName('');
        setNewRoomTopic('');
      } else {
        const error = await response.json();
        alert(`Failed to create room: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/group-admin/groups/${groupId}/posts/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        loadPosts(); // Reload to remove deleted post
      } else {
        const error = await response.json();
        alert(`Failed to delete post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const goBack = () => {
    window.location.pathname = '/groups';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Group not found</h2>
          <button onClick={goBack} className="mt-4 text-indigo-600 hover:text-indigo-800">
            Go back to groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={goBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to groups
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
              <p className="mt-1 text-sm text-gray-500">{group.description || 'No description'}</p>
              
              {/* Matrix Space Badge */}
              {group.matrix_space_id && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Group Chat Active
                    <a
                      href={`https://matrix.to/#/${group.matrix_space_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-indigo-600 hover:text-indigo-900 underline"
                    >
                      Open in Element
                    </a>
                  </div>
                  {/* Add Room button for admins/owners */}
                  {(userPermissions.can_pin_posts) && (
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      + Add Room
                    </button>
                  )}
                </div>
              )}
              
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {members.length} members
                </span>
                <span className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {posts.length} posts
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <GroupActionButtons
                groupId={Number(groupId)}
                isMember={isMemb}
                isFollowing={isFollowing}
                followerCount={followerCount}
                onMembershipChange={(isMember) => {
                  setIsMember(isMember);
                  loadMembers();
                }}
                onFollowChange={(following, newCount) => {
                  setIsFollowing(following);
                  setFollowerCount(newCount);
                }}
              />
              {isMemb && (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  New Post
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'posts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="inline h-5 w-5 mr-2" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline h-5 w-5 mr-2" />
              Members
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isMemb ? 'Be the first to post!' : 'Join the group to see posts'}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {post.is_pinned && (
                        <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                          Pinned
                        </div>
                      )}
                      {post.is_locked && (
                        <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 mb-2 ml-2">
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Posted by {post.author?.username || post.author?.email || 'Unknown'}
                    </span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  
                  <PostModerationActions
                    isPinned={post.is_pinned}
                    isLocked={post.is_locked}
                    isAuthor={currentUserId === post.author_id}
                    permissions={userPermissions}
                    onPin={() => togglePostPin(post.id)}
                    onLock={() => togglePostLock(post.id)}
                    onDelete={() => deletePost(post.id)}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {members.map((member) => (
                <li key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user?.username || member.user?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {formatDate(member.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(member.role)}
                    <span className="text-sm text-gray-600 capitalize">{member.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Post</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Share your thoughts, ask a question, or start a discussion..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setNewPostTitle('');
                  setNewPostContent('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!newPostTitle || !newPostContent}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Room in Group Chat
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Add a new discussion room to this group's Matrix Space. Members will see it in Element.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., General, Writing Tips, Book Club"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic (optional)
                  </label>
                  <textarea
                    value={newRoomTopic}
                    onChange={(e) => setNewRoomTopic(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="What's this room for?"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                    setNewRoomTopic('');
                  }}
                  disabled={creatingRoom}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoomInSpace}
                  disabled={!newRoomName.trim() || creatingRoom}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
