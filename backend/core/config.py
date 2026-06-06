import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DinnerSwipe API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 預設為 SQLite 供本地測試，正式環境請提供 Supabase 連線字串
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dinnerswipe.db")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30 # 30 days
    
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "dinnerswipe-admin-2024")

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
