import { Pin, Trash2, Lock, Unlock } from 'lucide-react';

interface PostModerationActionsProps {
  isPinned: boolean;
  isLocked: boolean;
  isAuthor: boolean;
  permissions: {
    can_pin_posts?: boolean;
    can_delete_posts?: boolean;
    can_lock_threads?: boolean;
  };
  onPin: () => void;
  onDelete: () => void;
  onLock: () => void;
}

export function PostModerationActions({
  isPinned,
  isLocked,
  isAuthor,
  permissions,
  onPin,
  onDelete,
  onLock,
}: PostModerationActionsProps) {
  const canPin = permissions.can_pin_posts || false;
  const canDelete = permissions.can_delete_posts || isAuthor;
  const canLock = permissions.can_lock_threads || false;

  // If user has no moderation permissions, don't show anything
  if (!canPin && !canDelete && !canLock) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
      {canPin && (
        <button
          onClick={onPin}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isPinned
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isPinned ? 'Unpin post' : 'Pin post'}
        >
          <Pin className={`h-3.5 w-3.5 mr-1.5 ${isPinned ? 'fill-current' : ''}`} />
          {isPinned ? 'Unpin' : 'Pin'}
        </button>
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
