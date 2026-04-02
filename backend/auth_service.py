"""Supabase-backed user authentication helpers."""

import os
from typing import Any, Optional

from supabase_client import get_supabase_client
from tenant_service import SupabaseTenantManager
from werkzeug.security import check_password_hash, generate_password_hash

supabase = get_supabase_client()


def _resolve_demo_password(username: str) -> str:
    specific = os.getenv(f"DEMO_{username.upper()}_PASSWORD")
    if specific:
        return specific

    shared = os.getenv("DEMO_DEFAULT_PASSWORD")
    if shared:
        return shared

    return "change-this-demo-password"


FALLBACK_USERS: dict[str, dict[str, Any]] = {
    "admin": {
        "id": 1,
        "username": "admin",
        "password_hash": generate_password_hash(_resolve_demo_password("admin")),
        "role": "ADMIN",
        "status": "active",
        "tenant_id": "global",
    },
    "auditor": {
        "id": 2,
        "username": "auditor",
        "password_hash": generate_password_hash(_resolve_demo_password("auditor")),
        "role": "AUDITOR",
        "status": "active",
        "tenant_id": "global",
    },
    "user": {
        "id": 3,
        "username": "user",
        "password_hash": generate_password_hash(_resolve_demo_password("user")),
        "role": "USER",
        "status": "active",
        "tenant_id": "global",
    },
}
FALLBACK_USER_COUNTER = 4


class SupabaseAuthManager:
    """Manages user authentication using Supabase PostgreSQL."""

    @staticmethod
    def normalize_tenant_id(tenant_id: Optional[str]) -> str:
        normalized = (tenant_id or "global").strip()
        return normalized or "global"

    @staticmethod
    def _is_fallback_mode() -> bool:
        return supabase is None

    @staticmethod
    def _fallback_user(
        username: str, tenant_id: Optional[str] = None
    ) -> Optional[dict[str, Any]]:
        user = FALLBACK_USERS.get(username)
        if not user:
            return None

        normalized_tenant_id = SupabaseAuthManager.normalize_tenant_id(tenant_id)
        user_tenant_id = SupabaseAuthManager.normalize_tenant_id(user.get("tenant_id"))
        if user_tenant_id != normalized_tenant_id:
            return None

        return dict(user)

    @staticmethod
    def is_configured() -> bool:
        return supabase is not None

    @staticmethod
    def _config_error() -> dict[str, Any]:
        return {
            "success": False,
            "error": "Supabase is not configured. Set valid SUPABASE_URL and SUPABASE_KEY values in backend/.env",
        }

    @staticmethod
    def _matches_password(stored_value: Optional[str], candidate: str) -> bool:
        if not stored_value:
            return False

        try:
            return check_password_hash(stored_value, candidate)
        except Exception:
            return False

    @staticmethod
    def _upgrade_plaintext_password(user: dict[str, Any], raw_password: str) -> None:
        user_id = user.get("id")
        if user_id is None:
            return

        hashed_password = generate_password_hash(raw_password)
        try:
            supabase.table("users").update(
                {
                    "password": hashed_password,
                    "password_hash": hashed_password,
                }
            ).eq("id", user_id).execute()
        except Exception:
            # Best-effort migration; login should still succeed.
            return

    @staticmethod
    def init_db():
        """Validate connection to Supabase users table."""
        if supabase is None:
            return True, "Supabase not configured. Using local demo users."

        try:
            supabase.table("users").select("*").limit(1).execute()
            return True, "Connected to Supabase users table"
        except Exception as e:
            return False, f"Supabase users table check failed: {e}"

    @staticmethod
    def get_user_by_username(
        username: str, tenant_id: Optional[str] = None
    ) -> Optional[dict[str, Any]]:
        normalized_tenant_id = SupabaseAuthManager.normalize_tenant_id(tenant_id)

        if SupabaseAuthManager._is_fallback_mode():
            return SupabaseAuthManager._fallback_user(username, normalized_tenant_id)

        try:
            response = (
                supabase.table("users").select("*").eq("username", username).execute()
            )
            if response.data:
                for user in response.data:
                    user_tenant_id = SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    )
                    if user_tenant_id == normalized_tenant_id:
                        return user
            return None
        except Exception:
            return None

    @staticmethod
    def create_user(
        username: str,
        password: str,
        role: str = "USER",
        tenant_id: Optional[str] = None,
    ) -> dict:
        """Create a new user in Supabase users table."""
        normalized_role = (role or "USER").upper()
        normalized_tenant_id = SupabaseAuthManager.normalize_tenant_id(tenant_id)
        if normalized_role not in {"SUPER_ADMIN", "ADMIN", "AUDITOR", "USER"}:
            return {"error": "Invalid role"}
        if not SupabaseTenantManager.tenant_exists(normalized_tenant_id):
            return {"error": f"Tenant '{normalized_tenant_id}' does not exist"}

        if SupabaseAuthManager._is_fallback_mode():
            global FALLBACK_USER_COUNTER

            normalized_username = (username or "").strip()
            if not normalized_username or not password:
                return {"error": "Username and password are required"}
            if normalized_username in FALLBACK_USERS:
                return {"error": "User already exists"}

            FALLBACK_USERS[normalized_username] = {
                "id": FALLBACK_USER_COUNTER,
                "username": normalized_username,
                "password_hash": generate_password_hash(password),
                "role": normalized_role,
                "status": "active",
                "tenant_id": normalized_tenant_id,
            }
            FALLBACK_USER_COUNTER += 1

            return {
                "success": True,
                "user_id": FALLBACK_USERS[normalized_username]["id"],
            }

        try:
            existing = (
                supabase.table("users")
                .select("id,tenant_id")
                .eq("username", username)
                .execute()
            )
            if any(
                SupabaseAuthManager.normalize_tenant_id(user.get("tenant_id"))
                == normalized_tenant_id
                for user in (existing.data or [])
            ):
                return {"error": "User already exists"}

            hashed_password = generate_password_hash(password)
            payload = {
                "username": username,
                "password": hashed_password,
                "password_hash": hashed_password,
                "role": normalized_role,
                "status": "active",
                "tenant_id": normalized_tenant_id,
            }

            try:
                response = supabase.table("users").insert(payload).execute()
            except Exception as exc:
                # Allow a safe incremental rollout when the DB column has not
                # been added yet by falling back to the legacy insert shape.
                if "tenant_id" not in str(exc):
                    raise

                legacy_payload = {
                    "username": username,
                    "password": hashed_password,
                    "role": normalized_role,
                    "status": "active",
                }
                response = supabase.table("users").insert(legacy_payload).execute()

            return {
                "success": True,
                "user_id": response.data[0]["id"] if response.data else None,
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def authenticate_user(
        username: str, password: str, tenant_id: Optional[str] = None
    ) -> dict:
        """Authenticate user and return user data if credentials are valid."""
        normalized_tenant_id = SupabaseAuthManager.normalize_tenant_id(tenant_id)

        if SupabaseAuthManager._is_fallback_mode():
            user = SupabaseAuthManager.get_user_by_username(
                username, normalized_tenant_id
            )
            if not user:
                return {"success": False, "error": "Invalid username or password"}
            if user.get("status") == "inactive":
                return {"success": False, "error": "Account is inactive"}

            if not SupabaseAuthManager._matches_password(
                user.get("password_hash"), password
            ):
                return {"success": False, "error": "Invalid username or password"}

            return {
                "success": True,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                    "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    ),
                },
            }

        try:
            user = SupabaseAuthManager.get_user_by_username(
                username, normalized_tenant_id
            )
            if not user:
                return {"success": False, "error": "Invalid username or password"}

            if user.get("status") == "inactive":
                return {"success": False, "error": "Account is inactive"}

            stored_password = user.get("password")
            stored_password_hash = user.get("password_hash")

            valid_password = False
            if SupabaseAuthManager._matches_password(stored_password_hash, password):
                valid_password = True
            elif SupabaseAuthManager._matches_password(stored_password, password):
                valid_password = True
            elif stored_password and stored_password == password:
                # Backward-compatible login path for legacy plaintext rows.
                # Immediately upgrades the row to hashed storage.
                valid_password = True
                SupabaseAuthManager._upgrade_plaintext_password(user, password)

            if not valid_password:
                return {"success": False, "error": "Invalid username or password"}

            return {
                "success": True,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                    "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    ),
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_user(user_id: int) -> dict:
        """Get user by ID."""
        if SupabaseAuthManager._is_fallback_mode():
            for user in FALLBACK_USERS.values():
                if user["id"] == user_id:
                    return {
                        "id": user["id"],
                        "username": user["username"],
                        "role": user["role"],
                        "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                            user.get("tenant_id")
                        ),
                    }
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
                    "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    ),
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    @staticmethod
    def update_user(user_id: int, **kwargs) -> bool:
        """Update user data."""
        if SupabaseAuthManager._is_fallback_mode():
            for username, user in FALLBACK_USERS.items():
                if user["id"] == user_id:
                    FALLBACK_USERS[username] = {**user, **kwargs}
                    return True
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
        if SupabaseAuthManager._is_fallback_mode():
            for username, user in list(FALLBACK_USERS.items()):
                if user["id"] == user_id and username != "admin":
                    del FALLBACK_USERS[username]
                    return True
            return False

        try:
            supabase.table("users").delete().eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    @staticmethod
    def list_all_users(tenant_id: Optional[str] = None) -> list:
        """Get all users (admin only)."""
        normalized_tenant_id = SupabaseAuthManager.normalize_tenant_id(tenant_id)

        if SupabaseAuthManager._is_fallback_mode():
            return [
                {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                    "created_at": "local-demo-user",
                    "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    ),
                }
                for user in FALLBACK_USERS.values()
                if SupabaseAuthManager.normalize_tenant_id(user.get("tenant_id"))
                == normalized_tenant_id
            ]

        try:
            response = (
                supabase.table("users")
                .select("id,username,role,created_at,tenant_id")
                .execute()
            )
            return [
                {
                    **user,
                    "tenant_id": SupabaseAuthManager.normalize_tenant_id(
                        user.get("tenant_id")
                    ),
                }
                for user in (response.data or [])
                if SupabaseAuthManager.normalize_tenant_id(user.get("tenant_id"))
                == normalized_tenant_id
            ]
        except Exception as e:
            print(f"Error listing users: {e}")
            return []
