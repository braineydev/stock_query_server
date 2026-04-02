"""Shared environment configuration helpers for the backend."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)

_PLACEHOLDER_VALUES = {
    "https://your-project.supabase.co",
    "your-anon-key",
    "your-anon-or-service-role-key",
    "replace-with-a-long-random-secret",
}


def is_placeholder(value: Optional[str]) -> bool:
    if value is None:
        return True
    return value.strip() in _PLACEHOLDER_VALUES


def get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value or default


def get_supabase_url() -> Optional[str]:
    value = get_env("SUPABASE_URL")
    return None if is_placeholder(value) else value


def get_supabase_key() -> Optional[str]:
    service_role = get_env("SUPABASE_SERVICE_ROLE_KEY")
    if not is_placeholder(service_role):
        return service_role

    anon_key = get_env("SUPABASE_KEY")
    return None if is_placeholder(anon_key) else anon_key


def has_supabase_config() -> bool:
    return bool(get_supabase_url() and get_supabase_key())


def get_jwt_secret() -> str:
    secret = get_env("JWT_SECRET_KEY")
    if is_placeholder(secret):
        return "super-secret-educational-key"
    return secret or "super-secret-educational-key"
