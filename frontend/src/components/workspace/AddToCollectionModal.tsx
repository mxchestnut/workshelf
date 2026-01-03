/**
 * AddToCollectionModal - Modal for adding documents to workspace collections
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { collectionApi, collectionItemApi } from '../../services/workspaceApi';
import type { WorkspaceCollection } from '../../types/workspace';
import { toast } from '../../services/toast';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
}

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}) => {
  const { workspaces, currentWorkspace } = useWorkspace();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [collections, setCollections] = useState<WorkspaceCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentWorkspace) {
      setSelectedWorkspace(currentWorkspace.id);
    }
  }, [isOpen, currentWorkspace]);

  const loadCollections = useCallback(async () => {
    if (!selectedWorkspace) return;

    setIsLoading(true);
    try {
      const data = await collectionApi.list(selectedWorkspace);
      setCollections(data);
    } catch (error) {
      toast.error('Failed to load collections');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadCollections();
    }
  }, [selectedWorkspace, loadCollections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !selectedCollection) return;

    setIsSubmitting(true);
    try {
      await collectionItemApi.add(selectedWorkspace, selectedCollection, {
        item_type: 'document',
        item_id: documentId,
        note: note.trim() || undefined,
      });
      toast.success(`Added "${documentTitle}" to collection`);
      onClose();
      setNote('');
      setSelectedCollection('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add to collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add to Collection</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">Document</p>
          <p className="font-medium truncate">{documentTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
            <select
              value={selectedWorkspace}
              onChange={(e) => {
                setSelectedWorkspace(e.target.value);
                setSelectedCollection('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading collections...</div>
            ) : (
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                disabled={!selectedWorkspace || collections.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">
                  {collections.length === 0 ? 'No collections available' : 'Select a collection'}
                </option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Why are you saving this document?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCollection}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add to Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToCollectionModal;
