#!/usr/bin/env node
/**
 * Simple build-time environment validator.
 * Fails fast if VITE_API_URL is missing, has trailing slash, or embeds /api path segment.
 */

const errors = [];
const api = process.env.VITE_API_URL;

if (!api) {
  errors.push('VITE_API_URL is not set');
} else {
  if (api.endsWith('/')) errors.push('VITE_API_URL must not end with a trailing slash');
  if (/\/api\/?$/i.test(api)) errors.push('VITE_API_URL should be the domain base only (do not append /api)');
  if (!/^https:\/\//.test(api)) errors.push('VITE_API_URL must start with https://');
  try {
    // Basic URL parse check
    new URL(api);
  } catch (e) {
    errors.push(`VITE_API_URL is not a valid URL: ${e.message}`);
  }
}

if (errors.length) {
  console.error('\n[validate-env] Build aborted due to invalid environment configuration:');
  for (const err of errors) console.error('  •', err);
  process.exit(1);
}

console.log('[validate-env] Environment OK: VITE_API_URL=' + api);
