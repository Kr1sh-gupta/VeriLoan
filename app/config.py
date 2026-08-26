import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Loan Data Verification Copilot"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./copilot.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ENABLE_OFFLINE_AI_FALLBACK: bool = True
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
