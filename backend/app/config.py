import json
import threading
from pathlib import Path

from platformdirs import user_data_dir

from .schemas import Settings

APP_NAME = "SupportHelper"

# No Windows resolve para %LOCALAPPDATA%\SupportHelper
DATA_DIR = Path(user_data_dir(APP_NAME, appauthor=False))
CONFIG_FILE = DATA_DIR / "config.json"
CHROMA_DIR = DATA_DIR / "chroma"
MANIFEST_FILE = DATA_DIR / "index_manifest.json"

_lock = threading.Lock()


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)


def load_settings() -> Settings:
    ensure_dirs()
    if not CONFIG_FILE.exists():
        return Settings()
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return Settings(**data)
    except (json.JSONDecodeError, ValueError):
        return Settings()


def save_settings(settings: Settings) -> None:
    ensure_dirs()
    with _lock:
        CONFIG_FILE.write_text(
            json.dumps(settings.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "****"
    return "****" + value[-4:]


def is_masked(value: str) -> bool:
    return value.startswith("****")
