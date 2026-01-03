/**
 * CollectionList - Display and manage workspace collections
 */

import React, { useState, useEffect, useCallback } from 'react';
import { collectionApi } from '../../services/workspaceApi';
import type { WorkspaceCollection } from '../../types/workspace';
import { CollectionStatus } from '../../types/workspace';
import { toast } from '../../services/toast';

interface CollectionListProps {
  workspaceId: string;
}

const CollectionList: React.FC<CollectionListProps> = ({ workspaceId }) => {
  const [collections, setCollections] = useState<WorkspaceCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as CollectionStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await collectionApi.list(workspaceId);
      setCollections(data);
    } catch (error) {
      toast.error('Failed to load collections');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await collectionApi.create(workspaceId, formData);
      toast.success('Collection created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', status: 'draft' });
      await loadCollections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (collectionId: string, newStatus: CollectionStatus) => {
    try {
      await collectionApi.update(workspaceId, collectionId, { status: newStatus });
      toast.success('Collection status updated');
      await loadCollections();
    } catch (error) {
      toast.error('Failed to update collection status');
    }
  };

  const handleDelete = async (collectionId: string, name: string) => {
    if (!confirm(`Delete collection "${name}"?`)) return;

    try {
      await collectionApi.delete(workspaceId, collectionId);
      toast.success('Collection deleted');
      await loadCollections();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const getStatusColor = (status: CollectionStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">Loading collections...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Collections ({collections.length})</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Collection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div key={collection.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{collection.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(collection.status)}`}>
                  {collection.status}
                </span>
              </div>

              {collection.description && <p className="text-sm text-gray-600 mb-3">{collection.description}</p>}

              <div className="text-sm text-gray-500 mb-3">
                <p>Items: {collection.item_count || 0}</p>
                <p>Created: {new Date(collection.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2">
                <select
                  value={collection.status}
                  onChange={(e) => handleUpdateStatus(collection.id, e.target.value as CollectionStatus)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  onClick={() => handleDelete(collection.id, collection.name)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete collection"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {collections.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No collections yet. Create your first collection to get started.
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Collection</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Collection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is this collection about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CollectionStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CollectionList;
