import { useEffect, useState } from 'react';
import { ShieldAlert, Pin, Lock, Unlock, Trash2, UserX, Ban, AlertCircle } from 'lucide-react';

interface ModerationLogEntry {
  id: number;
  action_type: string;
  moderator_id: number | null;
  moderator_name: string | null;
  target_type: string | null;
  target_id: number | null;
  target_user_id: number | null;
  target_user_name: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface ModerationLogProps {
  groupId: number;
}

export default function ModerationLog({ groupId }: ModerationLogProps) {
  const [logs, setLogs] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [groupId, filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });
      if (filter) {
        params.append('action_type', filter);
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/group-admin/groups/${groupId}/audit-log?${params}`,
        { 
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to load audit log');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'pin_post':
      case 'unpin_post':
        return <Pin className="w-4 h-4" />;
      case 'lock_thread':
        return <Lock className="w-4 h-4" />;
      case 'unlock_thread':
        return <Unlock className="w-4 h-4" />;
      case 'delete_post':
      case 'delete_comment':
        return <Trash2 className="w-4 h-4" />;
      case 'kick_member':
        return <UserX className="w-4 h-4" />;
      case 'ban_member':
        return <Ban className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'delete_post':
      case 'delete_comment':
      case 'ban_member':
        return 'text-red-600';
      case 'lock_thread':
      case 'kick_member':
        return 'text-orange-600';
      case 'pin_post':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Moderation Audit Log</h2>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="delete_post">Delete Post</option>
          <option value="delete_comment">Delete Comment</option>
          <option value="pin_post">Pin Post</option>
          <option value="unpin_post">Unpin Post</option>
          <option value="lock_thread">Lock Thread</option>
          <option value="unlock_thread">Unlock Thread</option>
          <option value="ban_member">Ban Member</option>
          <option value="kick_member">Kick Member</option>
        </select>
      </div>

      {/* Log Entries */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No moderation actions recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moderator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`flex items-center gap-2 ${getActionColor(log.action_type)}`}>
                      {getActionIcon(log.action_type)}
                      <span className="text-sm font-medium">{formatActionType(log.action_type)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {log.moderator_name || 'System'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {log.target_user_name ? (
                      <span className="font-medium">{log.target_user_name}</span>
                    ) : (
                      <span className="text-gray-400">
                        {log.target_type} #{log.target_id}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.metadata?.post_title && (
                      <span className="italic">"{log.metadata.post_title}"</span>
                    )}
                    {log.metadata?.banned_role && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Role: {log.metadata.banned_role}
                      </span>
                    )}
                    {log.reason && (
                      <span className="block text-xs text-gray-500 mt-1">{log.reason}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
