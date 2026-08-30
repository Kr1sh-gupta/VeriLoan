import os
from pydantic import BaseModel
def _load_env_file(filepath: str):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

# Explicitly load .env from backend directory and workspace root
_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
_root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

_load_env_file(_backend_env)
_load_env_file(_root_env)

try:
    from dotenv import load_dotenv
    if os.path.exists(_backend_env):
        load_dotenv(_backend_env, override=True)
    if os.path.exists(_root_env):
        load_dotenv(_root_env, override=False)
except ImportError:
    pass

class Settings(BaseModel):
    PROJECT_NAME: str = "Loan Data Verification Copilot"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./copilot.db")
    ENABLE_OFFLINE_AI_FALLBACK: bool = True
    CORS_ORIGINS: list[str] = ["*"]

    @property
    def GEMINI_API_KEY(self) -> str:
        if os.path.exists(_backend_env):
            _load_env_file(_backend_env)
        return os.getenv("GEMINI_API_KEY", "")

settings = Settings()
