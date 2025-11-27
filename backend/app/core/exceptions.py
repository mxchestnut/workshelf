"""
Custom exceptions for the application
"""

class NotFoundError(Exception):
    """Raised when a resource is not found"""
    pass


class ForbiddenError(Exception):
    """Raised when user doesn't have permission"""
    pass


class ValidationError(Exception):
    """Raised when validation fails"""
    pass
