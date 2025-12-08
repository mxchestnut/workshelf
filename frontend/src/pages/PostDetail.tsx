import { useState, useEffect } from 'react';
import { ArrowLeft, Pin, Lock, Pencil } from 'lucide-react';
import TagInput from '../components/TagInput';
import { PostModerationActions } from '../components/PostModerationActions';

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev';

interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  usage_count: number;
}

interface Post {
  id: number;
  group_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  pinned_feeds?: string[];
  author_id: number;
  created_at: string;
  tags?: Tag[];
  author?: {
    id: number;
    username?: string;
    email: string;
  };
}

interface Group {
  id: number;
  name: string;
  slug: string;
}

export default function PostDetail() {
  const [post, setPost] = useState<Post | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<{
    can_pin_posts?: boolean;
    can_delete_posts?: boolean;
    can_lock_threads?: boolean;
  }>({});

  // Extract group slug and post ID from URL: /groups/:slug/posts/:id
  const pathParts = window.location.pathname.split('/');
  const groupSlug = pathParts[2];
  const postId = pathParts[4];

  useEffect(() => {
    loadCurrentUser();
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug, postId]);

  useEffect(() => {
    if (group && currentUser) {
      checkUserMembership();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, currentUser]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadPost = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // First get the group to get its ID
      const groupResponse = await fetch(`${API_URL}/api/v1/groups/slug/${groupSlug}`, {
        headers
      });

      if (!groupResponse.ok) {
        throw new Error('Group not found');
      }

      const groupData = await groupResponse.json();
      setGroup(groupData);

      // Then get the post
      const postResponse = await fetch(`${API_URL}/api/v1/groups/${groupData.id}/posts/${postId}`, {
        headers
      });

      if (postResponse.ok) {
        const postData = await postResponse.json();
        
        // Load tags for this post
        try {
          const tagsResponse = await fetch(`${API_URL}/api/v1/content-tags/posts/${postId}`, {
            headers
          });
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            // Ensure each tag has usage_count
            postData.tags = tagsData.map((tag: any) => ({
              ...tag,
              usage_count: tag.usage_count || 0
            }));
          }
        } catch (tagError) {
          console.error('Failed to load tags:', tagError);
          postData.tags = [];
        }
        
        setPost(postData);
      } else {
        throw new Error('Post not found');
      }
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserMembership = async () => {
    if (!group?.id || !currentUser?.id) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/v1/groups/${group.id}/membership`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rolePermissions: Record<string, any> = {
          owner: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
          admin: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
          moderator: { can_pin_posts: true, can_delete_posts: true, can_lock_threads: true },
          member: {}
        };
        setUserPermissions(rolePermissions[data.member_role] || {});
      }
    } catch (error) {
      console.error('Failed to check membership:', error);
    }
  };

  const togglePostPin = async () => {
    if (!group?.id || !post?.id) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_URL}/api/v1/group-admin/groups/${group.id}/posts/${post.id}/pin`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        loadPost(); // Reload to show updated pin status
      } else {
        const error = await response.json();
        alert(`Failed to pin/unpin post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      alert('Failed to toggle pin');
    }
  };

  const togglePostLock = async () => {
    if (!group?.id || !post?.id) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_URL}/api/v1/group-admin/groups/${group.id}/posts/${post.id}/lock`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        loadPost(); // Reload to show updated lock status
      } else {
        const error = await response.json();
        alert(`Failed to lock/unlock post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
      alert('Failed to toggle lock');
    }
  };

  const deletePost = async () => {
    if (!group?.id || !post?.id) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_URL}/api/v1/groups/${group.id}/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        window.location.href = `/groups/${groupSlug}`;
      } else {
        const error = await response.json();
        alert(`Failed to delete post: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  const pinToFeeds = async (feeds: string[]) => {
    if (!group?.id || !post?.id) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_URL}/api/v1/group-admin/groups/${group.id}/posts/${post.id}/pin-to-feeds`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ feeds })
        }
      );
      
      if (response.ok) {
        loadPost(); // Reload to show updated pin status
      } else {
        const error = await response.json();
        alert(`Failed to pin post to feeds: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to pin to feeds:', error);
      alert('Failed to pin to feeds');
    }
  };

  const startEditing = () => {
    if (post) {
      setEditTitle(post.title);
      setEditContent(post.content);
      setEditTags(post.tags || []);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    setEditTags([]);
  };

  const saveEdit = async () => {
    if (!post || !editTitle || !editContent) return;

    try {
      const token = localStorage.getItem('access_token');
      
      // Update post tags
      // Get current tag IDs
      const currentTagIds = (post.tags || []).map(t => t.id);
      const newTagIds = editTags.map(t => t.id);
      
      // Remove tags that are no longer selected
      for (const tagId of currentTagIds) {
        if (!newTagIds.includes(tagId)) {
          await fetch(`${API_URL}/api/v1/content-tags/posts/${post.id}/tags/${tagId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Add new tags
      for (const tagId of newTagIds) {
        if (!currentTagIds.includes(tagId)) {
          await fetch(`${API_URL}/api/v1/content-tags/posts/${post.id}/tags/${tagId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Reload the post to get updated tags
      await loadPost();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!post || !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
            <a href="/groups" className="text-indigo-600 hover:text-indigo-800">
              Go back to groups
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => window.location.href = `/groups/${groupSlug}`}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to {group.name}
        </button>

        {/* Post card */}
        <article className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          {/* Header with badges and edit button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {post.is_pinned && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Pin className="w-3 h-3" />
                  Pinned
                </div>
              )}
              {post.is_locked && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  <Lock className="w-3 h-3" />
                  Locked
                </div>
              )}
            </div>
            
            {/* Edit button - show if user is post author */}
            {currentUser && post.author?.id === currentUser.id && !isEditing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-3xl font-bold text-gray-900 mb-4 px-3 py-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Post title"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
            <span>
              Posted by <span className="font-medium text-gray-700">{post.author?.username || post.author?.email || 'Unknown'}</span>
            </span>
            <span>•</span>
            <span>{formatDate(post.created_at)}</span>
            <span>•</span>
            <a href={`/groups/${groupSlug}`} className="text-indigo-600 hover:text-indigo-800">
              {group.name}
            </a>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Post content"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <TagInput
                  selectedTags={editTags}
                  onTagsChange={setEditTags}
                  placeholder="Add tags..."
                  maxTags={10}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveEdit}
                  disabled={!editTitle || !editContent}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="prose prose-lg max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </div>
              
              {/* Display tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {post.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 cursor-pointer"
                      onClick={() => window.location.href = `/feed?tag=${tag.slug}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Post moderation actions */}
          <PostModerationActions
            isPinned={post.is_pinned}
            isLocked={post.is_locked}
            pinnedFeeds={post.pinned_feeds || []}
            isAuthor={currentUser?.id === post.author_id}
            permissions={userPermissions}
            onPin={togglePostPin}
            onLock={togglePostLock}
            onDelete={deletePost}
            onPinToFeeds={pinToFeeds}
          />
        </article>
      </div>
    </div>
  );
}
