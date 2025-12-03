/**
 * Matomo Analytics Configuration for WorkShelf
 * Privacy-focused analytics with cookie-less tracking and DoNotTrack respect
 */

declare global {
  interface Window {
    _paq: any[];
  }
}

const MATOMO_URL = 'https://workshelfdev.matomo.cloud/';
const MATOMO_SITE_ID = '1';
const MATOMO_SCRIPT_URL = 'https://cdn.matomo.cloud/workshelfdev.matomo.cloud/matomo.js';

export function initMatomo() {
  // Only initialize in production or if explicitly enabled
  const environment = import.meta.env.VITE_ENVIRONMENT || 'production';
  const enabled = import.meta.env.VITE_MATOMO_ENABLED !== 'false';
  
  if (environment === 'development' && !enabled) {
    console.log('[Matomo] Skipped in development (set VITE_MATOMO_ENABLED=true to enable)');
    return;
  }

  // Initialize Matomo tracking array
  window._paq = window._paq || [];
  const _paq = window._paq;

  // Privacy-focused configuration
  _paq.push(['setCookieDomain', '*.workshelf.dev']);
  _paq.push(['setDoNotTrack', true]); // Respect browser DoNotTrack
  _paq.push(['disableCookies']); // Cookie-less tracking for GDPR compliance
  
  // Track initial page view
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);

  // Set tracker URL and site ID
  _paq.push(['setTrackerUrl', MATOMO_URL + 'matomo.php']);
  _paq.push(['setSiteId', MATOMO_SITE_ID]);

  // Load Matomo script asynchronously
  const script = document.createElement('script');
  script.async = true;
  script.src = MATOMO_SCRIPT_URL;
  
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  }

  console.log(`[Matomo] Initialized for ${environment} (cookie-less, DoNotTrack enabled)`);
}

/**
 * Track a custom event in Matomo
 * @param category - Event category (e.g., 'Document', 'Group', 'User')
 * @param action - Event action (e.g., 'Create', 'Delete', 'Share')
 * @param name - Event name (optional, e.g., document title)
 * @param value - Event value (optional, numeric)
 */
export function trackEvent(category: string, action: string, name?: string, value?: number) {
  if (window._paq) {
    window._paq.push(['trackEvent', category, action, name, value]);
  }
}

/**
 * Track a page view manually (useful for SPA navigation)
 * @param customTitle - Custom page title (optional)
 */
export function trackPageView(customTitle?: string) {
  if (window._paq) {
    if (customTitle) {
      window._paq.push(['setDocumentTitle', customTitle]);
    }
    window._paq.push(['trackPageView']);
  }
}

/**
 * Set user ID for tracking (call after login)
 * @param userId - User ID or username
 */
export function setUserId(userId: string) {
  if (window._paq) {
    window._paq.push(['setUserId', userId]);
  }
}

/**
 * Reset user ID (call after logout)
 */
export function resetUserId() {
  if (window._paq) {
    window._paq.push(['resetUserId']);
  }
}

/**
 * Track a site search
 * @param keyword - Search keyword
 * @param category - Search category (optional)
 * @param resultsCount - Number of results (optional)
 */
export function trackSiteSearch(keyword: string, category?: string, resultsCount?: number) {
  if (window._paq) {
    window._paq.push(['trackSiteSearch', keyword, category, resultsCount]);
  }
}
