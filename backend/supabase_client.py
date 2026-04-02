"""Shared Supabase client helpers for the backend."""

from typing import Optional

from config import get_supabase_key, get_supabase_url, has_supabase_config
from supabase import Client, create_client

_supabase_client: Optional[Client] = None
_supabase_error: Optional[str] = None


def get_supabase_client() -> Optional[Client]:
    """Return a shared Supabase client instance when configured."""
    global _supabase_client, _supabase_error

    if _supabase_client is not None:
        return _supabase_client

    if not has_supabase_config():
        _supabase_error = (
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )
        return None

    try:
        _supabase_client = create_client(get_supabase_url(), get_supabase_key())
        _supabase_error = None
        return _supabase_client
    except Exception as exc:
        _supabase_error = str(exc)
        return None


def get_supabase_error() -> Optional[str]:
    """Return the latest client initialization error, if any."""
    if _supabase_client is not None:
        return None
    if _supabase_error is None:
        get_supabase_client()
    return _supabase_error


def get_supabase_status() -> dict:
    """Summarize current Supabase configuration and client state."""
    client = get_supabase_client()
    return {
        "configured": has_supabase_config(),
        "connected": client is not None,
        "url": get_supabase_url(),
        "error": None if client is not None else get_supabase_error(),
    }
