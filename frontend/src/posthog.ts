/**
 * PostHog Product Analytics Configuration for Workshelf
 * Provides session replay, feature flags, funnels, and user behavior tracking
 */

import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_GnJ8zb09tygMcjttDyBrcY3lULGThdeQc8IpP695rpb'
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export function initPostHog() {
  // Only initialize in production or if explicitly enabled
  const environment = import.meta.env.VITE_ENVIRONMENT || 'production'
  const enabled = import.meta.env.VITE_POSTHOG_ENABLED !== 'false'
  
  if (environment === 'development' && !enabled) {
    console.log('[PostHog] Skipped in development (set VITE_POSTHOG_ENABLED=true to enable)')
    return
  }

  if (!POSTHOG_KEY) {
    console.log('[PostHog] Not configured (VITE_POSTHOG_KEY not set)')
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    
    // Privacy-focused configuration
    respect_dnt: true, // Respect Do Not Track
    opt_out_capturing_by_default: false, // Can be toggled via user preferences
    
    // Session replay (great for debugging UX issues)
    session_recording: {
      maskAllInputs: true, // Mask sensitive input fields
      maskTextSelector: '.sensitive', // Additional masking
      recordCrossOriginIframes: false,
    },
    
    // Autocapture clicks and form interactions
    autocapture: {
      dom_event_allowlist: ['click', 'submit'], // Only capture clicks and form submits
      url_allowlist: ['nerdchurchpartners.org'], // Only capture on our domain
    },
    
    // Performance
    loaded: (posthog) => {
      if (environment === 'development') {
        posthog.debug() // Enable debug mode in development
      }
    },
    
    // Feature flags
    bootstrap: {
      featureFlags: {}, // Will be populated from server if needed
    },
  })

  console.log(`[PostHog] Initialized for ${environment}`)
}

/**
 * Identify a user in PostHog (call after login)
 * @param userId - Unique user identifier
 * @param properties - Additional user properties
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof posthog !== 'undefined') {
    posthog.identify(userId, properties)
  }
}

/**
 * Reset user identity (call after logout)
 */
export function resetUser() {
  if (typeof posthog !== 'undefined') {
    posthog.reset()
  }
}

/**
 * Track a custom event
 * @param event - Event name
 * @param properties - Event properties
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof posthog !== 'undefined') {
    posthog.capture(event, properties)
  }
}

/**
 * Check if a feature flag is enabled
 * @param flag - Feature flag key
 * @returns boolean indicating if flag is enabled
 */
export function isFeatureEnabled(flag: string): boolean {
  if (typeof posthog !== 'undefined') {
    return posthog.isFeatureEnabled(flag) || false
  }
  return false
}

/**
 * Get feature flag payload (for multivariate flags)
 * @param flag - Feature flag key
 * @returns Flag payload or undefined
 */
export function getFeatureFlagPayload(flag: string): any {
  if (typeof posthog !== 'undefined') {
    return posthog.getFeatureFlagPayload(flag)
  }
  return undefined
}

/**
 * Manually trigger session recording
 */
export function startSessionRecording() {
  if (typeof posthog !== 'undefined') {
    posthog.startSessionRecording()
  }
}

/**
 * Stop session recording
 */
export function stopSessionRecording() {
  if (typeof posthog !== 'undefined') {
    posthog.stopSessionRecording()
  }
}

export default posthog
