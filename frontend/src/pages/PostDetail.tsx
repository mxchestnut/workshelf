import { useState, useEffect } from 'react';
import { ArrowLeft, Pin, Lock, Pencil } from 'lucide-react';
import TagInput from '../components/TagInput';

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

  // Extract group slug and post ID from URL: /groups/:slug/posts/:id
  const pathParts = window.location.pathname.split('/');
  const groupSlug = pathParts[2];
  const postId = pathParts[4];

  useEffect(() => {
    loadCurrentUser();
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug, postId]);

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
        </article>
      </div>
    </div>
  );
}
