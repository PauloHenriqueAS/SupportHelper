from pathlib import Path

from fastapi import APIRouter

from ..config import is_masked, load_settings, mask_secret, save_settings
from ..schemas import Settings, SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _to_response(settings: Settings) -> SettingsResponse:
    path = settings.knowledge_path.strip()
    return SettingsResponse(
        provider=settings.provider,
        model=settings.model,
        api_key_masked=mask_secret(settings.api_key),
        has_api_key=bool(settings.api_key),
        knowledge_path=path,
        knowledge_path_exists=bool(path) and Path(path).expanduser().is_dir(),
        ai_instructions=settings.ai_instructions,
    )


@router.get("", response_model=SettingsResponse)
def get_settings() -> SettingsResponse:
    return _to_response(load_settings())


@router.put("", response_model=SettingsResponse)
def update_settings(update: SettingsUpdate) -> SettingsResponse:
    current = load_settings()
    new_key = (update.api_key or "").strip()
    if not new_key or is_masked(new_key):
        new_key = current.api_key
    settings = Settings(
        provider=update.provider,
        model=update.model.strip() or current.model,
        api_key=new_key,
        knowledge_path=update.knowledge_path.strip(),
        ai_instructions=update.ai_instructions.strip(),
    )
    save_settings(settings)
    return _to_response(settings)
