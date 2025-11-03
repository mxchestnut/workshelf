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
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://workshelf:password@localhost:5432/workshelf"
    
    # Azure (optional for local dev)
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"
    
    # Keycloak
    KEYCLOAK_SERVER_URL: str = "http://keycloak:8080"  # Internal Docker network
    KEYCLOAK_REALM: str = "workshelf"
    KEYCLOAK_CLIENT_ID: str = "workshelf-backend"
    KEYCLOAK_CLIENT_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
