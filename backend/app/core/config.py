"""
Application configuration using Pydantic Settings
Loads from environment variables and .env file
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    PROJECT_NAME: str = "Work Shelf"
    VERSION: str = "0.1.0"
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
    
    @property
    def DATABASE_URL_CLEAN(self) -> str:
        """Clean DATABASE_URL for asyncpg compatibility"""
        url = self.DATABASE_URL
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
    
    # Keycloak
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
