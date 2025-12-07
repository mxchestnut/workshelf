import { useState, useEffect } from 'react';
import { ArrowLeft, Pin, Lock } from 'lucide-react';
import { Navigation } from '../components/Navigation';

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev';

interface Post {
  id: number;
  group_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
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

  // Extract group slug and post ID from URL: /groups/:slug/posts/:id
  const pathParts = window.location.pathname.split('/');
  const groupSlug = pathParts[2];
  const postId = pathParts[4];

  useEffect(() => {
    loadPost();
  }, [groupSlug, postId]);

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
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
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

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

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
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
