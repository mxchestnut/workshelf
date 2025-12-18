"""
Application configuration using Pydantic Settings
Loads from environment variables and .env file
"""
import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    PROJECT_NAME: str = "Work Shelf"
    VERSION: str = "0.2.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    # CORS origins for frontend access
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",  # Admin dashboard
        "https://workshelf.dev",
        "https://www.workshelf.dev",
        "https://app.workshelf.dev",
        "https://admin.workshelf.dev",
        "https://kits-macbook-pro.tail41ebb6.ts.net"  # Tailscale admin access
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://workshelf:password@localhost:5432/workshelf"
    DATABASE_URL_STAGING: str = ""  # Optional staging database for tests
    
    @property
    def _effective_database_url(self) -> str:
        """Get the effective database URL - uses staging for tests if available"""
        is_test = os.getenv("PYTEST_CURRENT_TEST") is not None
        if is_test and self.DATABASE_URL_STAGING:
            return self.DATABASE_URL_STAGING
        return self.DATABASE_URL
    
    @property
    def DATABASE_URL_CLEAN(self) -> str:
        """Clean DATABASE_URL for asyncpg compatibility - uses staging DB for tests"""
        url = self._effective_database_url
        # Replace postgresql:// with postgresql+asyncpg:// for async driver
        if url.startswith('postgresql://'):
            url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        # Remove sslmode and channel_binding query params that asyncpg doesn't support
        # asyncpg handles SSL automatically
        url = url.replace('?sslmode=require&channel_binding=require', '')
        url = url.replace('?sslmode=require', '')
        url = url.replace('&sslmode=require', '')
        url = url.replace('&channel_binding=require', '')
        return url
    
    # Azure (optional for local dev)
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"
    
    # AWS SES Email
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    FROM_EMAIL: str = "noreply@workshelf.dev"
    FRONTEND_URL: str = "https://workshelf.dev"
    
    # S3-Compatible Object Storage (AWS S3, MinIO, etc.)
    S3_ENDPOINT_URL: str = ""  # Leave empty for AWS S3, set for MinIO (e.g., http://minio:9000)
    S3_ACCESS_KEY_ID: str = ""  # Defaults to AWS_ACCESS_KEY_ID if not set
    S3_SECRET_ACCESS_KEY: str = ""  # Defaults to AWS_SECRET_ACCESS_KEY if not set
    S3_BUCKET_NAME: str = "workshelf-documents"
    S3_REGION: str = "us-east-1"
    
    @property
    def S3_ACCESS_KEY_ID_CLEAN(self) -> str:
        """Return S3 access key, fallback to AWS key"""
        return self.S3_ACCESS_KEY_ID or self.AWS_ACCESS_KEY_ID
    
    @property
    def S3_SECRET_ACCESS_KEY_CLEAN(self) -> str:
        """Return S3 secret key, fallback to AWS key"""
        return self.S3_SECRET_ACCESS_KEY or self.AWS_SECRET_ACCESS_KEY
    
    # Microsoft Entra ID (Azure AD) Authentication
    AZURE_TENANT: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    
    # Keycloak (Legacy - keeping for backward compatibility during migration)
    # Public issuer URL should match Keycloak's external hostname for token "iss"
    KEYCLOAK_SERVER_URL: str = "https://keycloak.workshelf.dev"
    # Internal URL used by the backend to fetch JWKS via Docker network
    KEYCLOAK_INTERNAL_URL: str = "http://keycloak:8080"
    KEYCLOAK_REALM: str = "workshelf"
    KEYCLOAK_CLIENT_ID: str = "workshelf-backend"
    KEYCLOAK_CLIENT_SECRET: str = ""
    
    # Stripe Payment Processing
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
