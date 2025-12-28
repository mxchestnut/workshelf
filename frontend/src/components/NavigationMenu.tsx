import React, { useEffect, useState } from 'react';
import { Construction, StarHalf, Star, MoonStar, Filter, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://nerdchurchpartners.org';

interface NavigationItem {
  page_path: string;
  page_title: string;
  icon: 'construction' | 'star-half' | 'star' | 'moon-star';
  status: 'construction' | 'ready' | 'stable';
  current_version: string | null;
  description: string | null;
  requires_auth: boolean;
  is_staff_only: boolean;
}

interface NavigationResponse {
  items: NavigationItem[];
  total_count: number;
  filter_applied: string | null;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagePath: string;
  pageTitle: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, pagePath, pageTitle }) => {
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setSending(true);
    try {
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
      // Send feedback message (you can customize this endpoint)
      const response = await fetch(`${API_URL}/api/v1/messaging/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({
          recipient_username: 'warpxth',
          message: `Feedback on ${pageTitle} (${pagePath}):\n\n${feedback}`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }
      
      alert('Feedback sent to warpxth! Thank you for your review.');
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Send Feedback to warpxth</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          You've marked <strong>{pageTitle}</strong> as reviewed. Share your thoughts with warpxth:
        </p>
        
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What did you think? Any suggestions?"
        />
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            disabled={sending || !feedback.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Feedback'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

const NavigationMenu: React.FC = () => {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; path: string; title: string }>({
    open: false,
    path: '',
    title: ''
  });

  const navigateTo = (path: string) => {
    // Use pushState to navigate without full page reload
    window.history.pushState({}, '', path);
    // Trigger popstate event so App.tsx picks up the route change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchNavigation = async (filterBy?: string) => {
    setLoading(true);
    try {
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
      const url = filterBy 
        ? `${API_URL}/api/v1/pages/navigation?filter_by=${filterBy}`
        : `${API_URL}/api/v1/pages/navigation`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch navigation');
      }

      const data: NavigationResponse = await response.json();
      setItems(data.items);
    } catch (error) {
      console.error('Failed to load navigation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNavigation(filter || undefined);
  }, [filter]);

  const handleItemClick = (item: NavigationItem) => {
    // Navigate to the page
    navigateTo(item.page_path);
    
    // Record the view
    const apiPath = item.page_path === '/' ? 'landing' : item.page_path.substring(1);
    const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
    fetch(`${API_URL}/api/v1/pages/${apiPath}/view`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      mode: 'cors'
    }).catch(console.error);
  };

  const handleMarkViewed = async (item: NavigationItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const apiPath = item.page_path === '/' ? 'landing' : item.page_path.substring(1);
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
      const response = await fetch(`${API_URL}/api/v1/pages/${apiPath}/mark-viewed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({
          marked_as_viewed: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as viewed');
      }
      
      // Show feedback modal
      setFeedbackModal({
        open: true,
        path: item.page_path,
        title: item.page_title
      });
      
      // Refresh navigation
      fetchNavigation(filter || undefined);
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  const renderIcon = (icon: string, item: NavigationItem) => {
    const iconSize = 18;
    const iconClass = "inline-block mr-2";
    
    switch (icon) {
      case 'construction':
        return <Construction size={iconSize} className={`${iconClass} text-orange-500`} />;
      case 'star-half':
        return (
          <button
            onClick={(e) => handleMarkViewed(item, e)}
            className="inline-flex items-center mr-2 hover:scale-110 transition-transform"
            title="Click to mark as reviewed"
          >
            <StarHalf size={iconSize} className="text-yellow-500" />
          </button>
        );
      case 'star':
        return <Star size={iconSize} className={`${iconClass} text-yellow-500 fill-yellow-500`} />;
      case 'moon-star':
        return <MoonStar size={iconSize} className={`${iconClass} text-blue-500`} />;
      default:
        return null;
    }
  };

  const filters = [
    { value: null, label: 'All Pages' },
    { value: 'construction', label: 'Under Construction' },
    { value: 'needs-review', label: 'Needs Review' },
    { value: 'viewed', label: 'Reviewed' },
    { value: 'stable', label: 'No Changes' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Filter size={16} />
          Filter: {filters.find(f => f.value === filter)?.label || 'All Pages'}
        </button>
        
        {showFilter && (
          <div className="mt-2 flex flex-col gap-1">
            {filters.map(f => (
              <button
                key={f.label}
                onClick={() => {
                  setFilter(f.value);
                  setShowFilter(false);
                }}
                className={`text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                  filter === f.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No pages match this filter</div>
        ) : (
          <nav className="p-2">
            {items.map((item) => (
              <button
                key={item.page_path}
                onClick={() => handleItemClick(item)}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors mb-1 group"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {renderIcon(item.icon, item)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 group-hover:text-blue-600">
                      {item.page_title}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                    {item.current_version && (
                      <div className="text-xs text-gray-400 mt-1">
                        v{item.current_version}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <Construction size={14} className="text-orange-500" />
            <span>Under construction</span>
          </div>
          <div className="flex items-center gap-2">
            <StarHalf size={14} className="text-yellow-500" />
            <span>Ready for review (click to mark)</span>
          </div>
          <div className="flex items-center gap-2">
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
            <span>You've reviewed this</span>
          </div>
          <div className="flex items-center gap-2">
            <MoonStar size={14} className="text-blue-500" />
            <span>No changes since your visit</span>
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={feedbackModal.open}
        onClose={() => setFeedbackModal({ open: false, path: '', title: '' })}
        pagePath={feedbackModal.path}
        pageTitle={feedbackModal.title}
      />
    </div>
  );
};

export default NavigationMenu;
