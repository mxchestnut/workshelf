/**
 * Sentry configuration for WorkShelf frontend
 * Provides error tracking, performance monitoring, and session replay
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || 'https://b8c5190474974430cdd1396231416148@o4510280685977605.ingest.us.sentry.io/4510448574726144';
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';
const RELEASE = import.meta.env.VITE_RELEASE || 'unknown';

export function initSentry() {
  if (!SENTRY_DSN) {
    // Sentry is optional - silently skip if not configured
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,
    
    // Performance monitoring: sample 10% of transactions in production
    tracesSampleRate: ENVIRONMENT === 'development' ? 1.0 : 0.1,
    
    // Capture user interaction breadcrumbs
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Session replay: capture 10% of sessions, 100% of error sessions
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Session replay sampling
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^Loading chunk \d+ failed/, // Network errors during code-splitting
    ],
    
    // Attach user context when available (set via Sentry.setUser elsewhere)
    beforeSend(event) {
      // Strip sensitive data from URLs/headers if needed
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
      }
      return event;
    },
  });

  console.log(`[Sentry] Initialized for ${ENVIRONMENT} (${RELEASE})`);
}
