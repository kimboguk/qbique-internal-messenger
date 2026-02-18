import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "benedict/linkbricks-gemma2-korean:27b")

DB_HOST = os.getenv("DB_HOST", "/var/run/postgresql")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "qim")
DB_USER = os.getenv("DB_USER", "kimboguk")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8008"))
