import { Pin, Trash2, Lock, Unlock, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface PostModerationActionsProps {
  isPinned: boolean;
  isLocked: boolean;
  isAuthor: boolean;
  pinnedFeeds?: string[];
  permissions: {
    can_pin_posts?: boolean;
    can_delete_posts?: boolean;
    can_lock_threads?: boolean;
  };
  onPin: () => void;
  onDelete: () => void;
  onLock: () => void;
  onPinToFeeds?: (feeds: string[]) => void;
}

export function PostModerationActions({
  isPinned,
  isLocked,
  isAuthor,
  pinnedFeeds = [],
  permissions,
  onPin,
  onDelete,
  onLock,
  onPinToFeeds,
}: PostModerationActionsProps) {
  const [showFeedSelector, setShowFeedSelector] = useState(false);
  const canPin = permissions.can_pin_posts || false;
  const canDelete = permissions.can_delete_posts || isAuthor;
  const canLock = permissions.can_lock_threads || false;

  const availableFeeds = [
    { id: 'group', label: 'Group Feed' },
    { id: 'personal', label: 'Personal Feed' },
    { id: 'global', label: 'Global Feed' },
    { id: 'discover', label: 'Discover Feed' },
  ];

  const toggleFeed = (feedId: string) => {
    if (!onPinToFeeds) return;
    
    const newFeeds = pinnedFeeds.includes(feedId)
      ? pinnedFeeds.filter(f => f !== feedId)
      : [...pinnedFeeds, feedId];
    
    onPinToFeeds(newFeeds);
    setShowFeedSelector(false);
  };

  // If user has no moderation permissions, don't show anything
  if (!canPin && !canDelete && !canLock) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
      {canPin && (
        <div className="relative">
          <button
            onClick={onPinToFeeds ? () => setShowFeedSelector(!showFeedSelector) : onPin}
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isPinned || pinnedFeeds.length > 0
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={isPinned ? 'Manage pin' : 'Pin post'}
          >
            <Pin className={`h-3.5 w-3.5 mr-1.5 ${isPinned ? 'fill-current' : ''}`} />
            {pinnedFeeds.length > 0 ? `Pinned (${pinnedFeeds.length})` : isPinned ? 'Pinned' : 'Pin'}
            {onPinToFeeds && <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </button>
          
          {showFeedSelector && onPinToFeeds && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-700 mb-2 px-2">Pin to feeds:</div>
                {availableFeeds.map(feed => (
                  <button
                    key={feed.id}
                    onClick={() => toggleFeed(feed.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center justify-between"
                  >
                    <span>{feed.label}</span>
                    {pinnedFeeds.includes(feed.id) && (
                      <span className="text-yellow-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => setShowFeedSelector(false)}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canLock && (
        <button
          onClick={onLock}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isLocked
              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isLocked ? 'Unlock thread' : 'Lock thread'}
        >
          {isLocked ? (
            <Unlock className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <Lock className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isLocked ? 'Unlock' : 'Lock'}
        </button>
      )}

      {canDelete && (
        <button
          onClick={onDelete}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          title="Delete post"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </button>
      )}
    </div>
  );
}
