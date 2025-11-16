const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev';
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface PendingEdit {
  id: number;
  author_id: number;
  author_name: string;
  user_id: number;
  user_email?: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  edit_summary: string | null;
  created_at: string;
}

interface ModerationStats {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  total_edits: number;
}

interface HistoryItem {
  id: number;
  author_id: number;
  author_name: string;
  user_email?: string;
  field_name: string;
  edit_summary: string | null;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const AdminModeration: React.FC = () => {
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEdit, setExpandedEdit] = useState<number | null>(null);
  const [moderatingId, setModeratingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in as an admin');
        setLoading(false);
        return;
      }

      // Load stats
  const statsRes = await fetch(`${API_URL}/api/v1/admin/moderation/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Load pending edits
  const editsRes = await fetch(`${API_URL}/api/v1/admin/moderation/pending-edits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (editsRes.ok) {
        setPendingEdits(await editsRes.json());
      } else {
        setError('Failed to load pending edits - are you an admin?');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load moderation data');
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/v1/admin/moderation/history?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleModerate = async (editId: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setModeratingId(editId);
    try {
      const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/v1/admin/moderation/${editId}/moderate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined
        })
      });

      if (res.ok) {
        // Remove from pending list
        setPendingEdits(prev => prev.filter(e => e.id !== editId));
        
        // Update stats
        if (stats) {
          setStats({
            ...stats,
            pending_count: stats.pending_count - 1,
            approved_today: action === 'approve' ? stats.approved_today + 1 : stats.approved_today,
            rejected_today: action === 'reject' ? stats.rejected_today + 1 : stats.rejected_today
          });
        }

        // Clear rejection reason
        setRejectionReason('');
        setExpandedEdit(null);
      } else {
        const errorData = await res.json();
        alert(`Failed to ${action}: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`Error ${action}ing edit:`, err);
      alert(`Failed to ${action} edit`);
    } finally {
      setModeratingId(null);
    }
  };

  const formatFieldName = (field: string): string => {
    const mapping: Record<string, string> = {
      bio: 'Biography',
      photo_url: 'Photo URL',
      birth_year: 'Birth Year',
      death_year: 'Death Year',
      nationality: 'Nationality',
      website: 'Website',
      social_links: 'Social Links',
      genres: 'Genres',
      awards: 'Awards'
    };
    return mapping[field] || field;
  };

  const renderDiff = (edit: PendingEdit) => {
    const isJSON = edit.field_name === 'social_links' || edit.field_name === 'genres' || edit.field_name === 'awards';
    
    if (isJSON) {
      try {
        const oldVal = edit.old_value ? JSON.parse(edit.old_value) : null;
        const newVal = JSON.parse(edit.new_value);
        return (
          <div className="space-y-2">
            {edit.old_value && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs font-medium text-red-700 mb-1">OLD VALUE:</p>
                <pre className="text-sm text-red-900 whitespace-pre-wrap">{JSON.stringify(oldVal, null, 2)}</pre>
              </div>
            )}
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-xs font-medium text-green-700 mb-1">NEW VALUE:</p>
              <pre className="text-sm text-green-900 whitespace-pre-wrap">{JSON.stringify(newVal, null, 2)}</pre>
            </div>
          </div>
        );
      } catch {
        return <p className="text-red-500 text-sm">Invalid JSON data</p>;
      }
    }

    return (
      <div className="space-y-2">
        {edit.old_value && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-xs font-medium text-red-700 mb-1">OLD VALUE:</p>
            <p className="text-sm text-red-900 whitespace-pre-wrap">{edit.old_value}</p>
          </div>
        )}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-xs font-medium text-green-700 mb-1">NEW VALUE:</p>
          <p className="text-sm text-green-900 whitespace-pre-wrap">{edit.new_value}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading moderation queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Access Denied</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
              <p className="text-gray-600 mt-1">Review and approve author wiki edits</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.pending_count}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700 font-medium">Approved Today</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.approved_today}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-red-700 font-medium">Rejected Today</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{stats.rejected_today}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Total Edits</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total_edits}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Edits */}
        {pendingEdits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h2>
            <p className="text-gray-600">No pending edits to review right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEdits.map((edit) => (
              <div key={edit.id} className="bg-white rounded-lg shadow border border-gray-200">
                {/* Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedEdit(expandedEdit === edit.id ? null : edit.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {edit.author_name}
                        </h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          {formatFieldName(edit.field_name)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{edit.user_email || `User ${edit.user_id}`}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(edit.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {edit.edit_summary && (
                        <p className="text-sm text-gray-700 mt-2 italic">"{edit.edit_summary}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {expandedEdit === edit.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedEdit === edit.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {/* Diff */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Changes:</h4>
                      {renderDiff(edit)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason (if rejecting):
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain why this edit is being rejected..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleModerate(edit.id, 'approve')}
                          disabled={moderatingId === edit.id}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(edit.id, 'reject')}
                          disabled={moderatingId === edit.id}
                          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Link to author page */}
                    <div className="mt-4">
                      <a
                        href={`/authors/${edit.author_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View author profile →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* History Toggle */}
        <div className="mt-8">
          <button
            onClick={() => {
              if (!showHistory && history.length === 0) {
                loadHistory();
              }
              setShowHistory(!showHistory);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showHistory ? '← Hide' : 'Show'} Recent History
          </button>

          {showHistory && (
            <div className="mt-4 bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviewed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.author_name}</div>
                        <div className="text-xs text-gray-500">{item.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFieldName(item.field_name)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status === 'approved' ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.rejection_reason || item.edit_summary || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModeration;
