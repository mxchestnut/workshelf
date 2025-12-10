/**
 * Sentry configuration for WorkShelf frontend
 * Provides error tracking, performance monitoring, and session replay
 * 
 * NOTE: Temporarily disabled due to expired Sentry DSN
 */
// import * as Sentry from '@sentry/react';

// const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
// const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';
// const RELEASE = import.meta.env.VITE_RELEASE || 'unknown';

export function initSentry() {
  // Temporarily disabled due to invalid/expired Sentry DSN
  console.log('[Sentry] Disabled - DSN expired');
  // TODO: Re-enable when Sentry DSN is renewed
  // Remove the early return below and restore the full init code
  return;
}

/**
 * Original Sentry initialization code (disabled)
 * 
 * if (!SENTRY_DSN) {
 *   console.log('[Sentry] Skipped - no DSN configured');
 *   return;
 * }
 * 
 * Sentry.init({
 *   dsn: SENTRY_DSN,
 *   environment: ENVIRONMENT,
 *   release: RELEASE,
 *   tracesSampleRate: ENVIRONMENT === 'development' ? 1.0 : 0.1,
 *   integrations: [
 *     Sentry.browserTracingIntegration(),
 *     Sentry.replayIntegration({
 *       maskAllText: true,
 *       blockAllMedia: true,
 *     }),
 *   ],
 *   replaysSessionSampleRate: 0.1,
 *   replaysOnErrorSampleRate: 1.0,
 *   ignoreErrors: [
 *     'ResizeObserver loop limit exceeded',
 *     'Non-Error promise rejection captured',
 *     /^Loading chunk \d+ failed/,
 *   ],
 *   beforeSend(event) {
 *     if (event.request?.url) {
 *       event.request.url = event.request.url.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
 *     }
 *     return event;
 *   },
 * });
 * 
 * console.log(`[Sentry] Initialized for ${ENVIRONMENT} (${RELEASE})`);
 */
