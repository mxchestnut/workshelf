import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://nerdchurchpartners.org';

interface PageVersionProps {
  path: string;
}

interface PageVersionData {
  version: string;
  created_at: string;
  changes: string | null;
}

const PageVersion: React.FC<PageVersionProps> = ({ path }) => {
  const [version, setVersion] = useState<PageVersionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        // Remove leading slash for API call
        const apiPath = path === '/' ? 'landing' : (path.startsWith('/') ? path.substring(1) : path);
        const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
        const response = await fetch(`${API_URL}/api/v1/pages/${apiPath}/version`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch version');
        }

        const data: PageVersionData = await response.json();
        setVersion(data);
      } catch (error) {
        console.error('Failed to fetch page version:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();

    // Also record page view
    const recordView = async () => {
      try {
        const apiPath = path === '/' ? 'landing' : (path.startsWith('/') ? path.substring(1) : path);
        const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null;
        await fetch(`${API_URL}/api/v1/pages/${apiPath}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });
      } catch (error) {
        console.error('Failed to record page view:', error);
      }
    };

    recordView();
  }, [path]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!version) {
    return null; // No version set yet
  }

  const lastUpdated = new Date(version.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="mt-8 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          <span className="font-medium">Version:</span> {version.version}
        </div>
        <div>
          <span className="font-medium">Last updated:</span> {lastUpdated}
        </div>
      </div>
      {version.changes && (
        <div className="mt-2 text-xs text-gray-600 italic">
          {version.changes}
        </div>
      )}
    </div>
  );
};

export default PageVersion;
