"""Supabase-backed user authentication helpers."""

import os
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import Client, create_client
from werkzeug.security import check_password_hash

load_dotenv()


def _is_placeholder(value: Optional[str]) -> bool:
    if not value:
        return True
    return value in {
        "https://your-project.supabase.co",
        "your-anon-key",
    }


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Optional[Client] = None
if not _is_placeholder(SUPABASE_URL) and not _is_placeholder(SUPABASE_KEY):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class SupabaseAuthManager:
    """Manages user authentication using Supabase PostgreSQL."""

    @staticmethod
    def is_configured() -> bool:
        return supabase is not None

    @staticmethod
    def _config_error() -> dict[str, Any]:
        return {
            "success": False,
            "error": "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in backend/.env",
        }

    @staticmethod
    def init_db():
        """Validate connection to Supabase users table."""
        if supabase is None:
            return False, "Supabase not configured"

        try:
            supabase.table("users").select("*").limit(1).execute()
            return True, "Connected to Supabase users table"
        except Exception as e:
            return False, f"Supabase users table check failed: {e}"

    @staticmethod
    def get_user_by_username(username: str) -> Optional[dict[str, Any]]:
        if supabase is None:
            return None

        try:
            response = (
                supabase.table("users")
                .select("*")
                .eq("username", username)
                .limit(1)
                .execute()
            )
            if response.data:
                return response.data[0]
            return None
        except Exception:
            return None

    @staticmethod
    def create_user(username: str, password: str, role: str = "USER") -> dict:
        """Create a new user in Supabase users table."""
        if supabase is None:
            return SupabaseAuthManager._config_error()

        try:
            existing = (
                supabase.table("users").select("id").eq("username", username).execute()
            )
            if existing.data:
                return {"error": "User already exists"}

            normalized_role = (role or "USER").upper()
            if normalized_role not in {"SUPER_ADMIN", "ADMIN", "AUDITOR", "USER"}:
                return {"error": "Invalid role"}

            response = (
                supabase.table("users")
                .insert(
                    {
                        "username": username,
                        "password": password,
                        "role": normalized_role,
                        "status": "active",
                    }
                )
                .execute()
            )

            return {
                "success": True,
                "user_id": response.data[0]["id"] if response.data else None,
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def authenticate_user(username: str, password: str) -> dict:
        """Authenticate user and return user data if credentials are valid."""
        if supabase is None:
            return SupabaseAuthManager._config_error()

        try:
            user = SupabaseAuthManager.get_user_by_username(username)
            if not user:
                return {"success": False, "error": "Invalid username or password"}

            if user.get("status") == "inactive":
                return {"success": False, "error": "Account is inactive"}

            stored_password = user.get("password")
            stored_password_hash = user.get("password_hash")

            # Support plain-text password column used by current schema,
            # while remaining backward-compatible with password_hash.
            valid_password = False
            if stored_password is not None:
                valid_password = stored_password == password
            elif stored_password_hash:
                valid_password = check_password_hash(stored_password_hash, password)

            if not valid_password:
                return {"success": False, "error": "Invalid username or password"}

            return {
                "success": True,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_user(user_id: int) -> dict:
        """Get user by ID."""
        if supabase is None:
            return None

        try:
            response = (
                supabase.table("users")
                .select("id,username,role")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if response.data:
                user = response.data[0]
                return {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    @staticmethod
    def update_user(user_id: int, **kwargs) -> bool:
        """Update user data."""
        if supabase is None:
            return False

        try:
            supabase.table("users").update({**kwargs}).eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error updating user: {e}")
            return False

    @staticmethod
    def delete_user(user_id: int) -> bool:
        """Delete a user."""
        if supabase is None:
            return False

        try:
            supabase.table("users").delete().eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    @staticmethod
    def list_all_users() -> list:
        """Get all users (admin only)."""
        if supabase is None:
            return []

        try:
            response = (
                supabase.table("users").select("id,username,role,created_at").execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error listing users: {e}")
            return []
