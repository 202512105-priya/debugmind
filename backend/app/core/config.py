from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DebugMind"
    APP_ENV: str = "local"
    SECRET_KEY: str = "temporary_secret_key_change_in_production"
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@postgres:5432/debugmind"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Embeddings
    EMBEDDING_PROVIDER: str = "mock"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    OPENAI_API_KEY: Union[str, None] = None
    
    # LLM & RAG
    LLM_PROVIDER: str = "mock"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.0
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
