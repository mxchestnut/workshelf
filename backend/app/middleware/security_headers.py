"""
Security Headers Middleware
Adds comprehensive security headers to all responses
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import os


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all HTTP responses
    Configurable for development vs production environments
    
    Headers added:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Legacy XSS protection
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Disables unused browser features
    - Strict-Transport-Security: Enforces HTTPS (production only)
    - Content-Security-Policy: Prevents XSS and injection attacks (production only)
    """
    
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Environment-aware headers
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        
        # Prevent MIME type sniffing
        # Browsers won't try to guess content type, preventing XSS attacks
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        # Prevents page from being embedded in iframe/frame/embed/object
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Protection (legacy, but doesn't hurt)
        # Modern browsers have XSS auditors built-in, this enables them
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        # Only send origin (not full URL) when navigating to different origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy (disable unused features)
        # Prevents page from accessing geolocation, camera, microphone, etc.
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # HSTS (only in production with HTTPS)
        # Forces all future connections to use HTTPS for 1 year
        if is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Content Security Policy (only in production)
        # Prevents XSS attacks by controlling which resources can be loaded
        if is_production:
            # Adjust CSP based on your specific needs
            # This is a strict policy that may need customization
            csp_parts = [
                "default-src 'self'",  # Only load resources from same origin by default
                "script-src 'self' 'unsafe-inline' https://js.stripe.com",  # Allow Stripe.js
                "style-src 'self' 'unsafe-inline'",  # Allow inline styles (needed for React)
                "img-src 'self' data: https:",  # Allow images from same origin, data URIs, and HTTPS
                "font-src 'self' data:",  # Allow fonts from same origin and data URIs
                "connect-src 'self' https://api.stripe.com https://sentry.io",  # Allow API calls
                "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",  # Allow Stripe iframes
                "object-src 'none'",  # Disable plugins like Flash
                "base-uri 'self'",  # Restrict <base> tag to same origin
                "form-action 'self'",  # Only allow form submissions to same origin
                "frame-ancestors 'none'",  # Don't allow embedding (same as X-Frame-Options: DENY)
                "upgrade-insecure-requests",  # Upgrade HTTP to HTTPS automatically
            ]
            response.headers["Content-Security-Policy"] = "; ".join(csp_parts)
        
        return response
