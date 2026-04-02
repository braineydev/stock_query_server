"""Supabase-backed tenant registry helpers."""

from typing import Any, Optional

from supabase_client import get_supabase_client

supabase = get_supabase_client()


FALLBACK_TENANTS: dict[str, dict[str, Any]] = {
    "global": {
        "id": "global",
        "name": "Global Tenant",
        "status": "active",
        "created_at": "local-demo-tenant",
    }
}


class SupabaseTenantManager:
    """Manages tenant registry data using Supabase PostgreSQL."""

    @staticmethod
    def _is_fallback_mode() -> bool:
        return supabase is None

    @staticmethod
    def normalize_tenant_id(tenant_id: Optional[str]) -> str:
        normalized = (tenant_id or "global").strip()
        return normalized or "global"

    @staticmethod
    def init_db():
        """Validate connection to Supabase tenants table."""
        if supabase is None:
            return True, "Supabase not configured. Using local demo tenants."

        try:
            supabase.table("tenants").select("id").limit(1).execute()
            return True, "Connected to Supabase tenants table"
        except Exception as e:
            return False, f"Supabase tenants table check failed: {e}"

    @staticmethod
    def get_tenant(tenant_id: Optional[str]) -> Optional[dict[str, Any]]:
        normalized_tenant_id = SupabaseTenantManager.normalize_tenant_id(tenant_id)

        if SupabaseTenantManager._is_fallback_mode():
            tenant = FALLBACK_TENANTS.get(normalized_tenant_id)
            return dict(tenant) if tenant else None

        try:
            response = (
                supabase.table("tenants")
                .select("id,name,status,created_at")
                .eq("id", normalized_tenant_id)
                .limit(1)
                .execute()
            )
            if response.data:
                return response.data[0]
            return None
        except Exception:
            if normalized_tenant_id == "global":
                return dict(FALLBACK_TENANTS["global"])
            return None

    @staticmethod
    def tenant_exists(tenant_id: Optional[str]) -> bool:
        return SupabaseTenantManager.get_tenant(tenant_id) is not None

    @staticmethod
    def list_tenants() -> list[dict[str, Any]]:
        if SupabaseTenantManager._is_fallback_mode():
            return [dict(tenant) for tenant in FALLBACK_TENANTS.values()]

        try:
            response = (
                supabase.table("tenants")
                .select("id,name,status,created_at")
                .order("created_at", desc=False)
                .execute()
            )
            return response.data if response.data else [dict(FALLBACK_TENANTS["global"])]
        except Exception:
            return [dict(FALLBACK_TENANTS["global"])]

    @staticmethod
    def create_tenant(
        tenant_id: str, name: str, status: str = "active"
    ) -> dict[str, Any]:
        normalized_tenant_id = SupabaseTenantManager.normalize_tenant_id(tenant_id)
        normalized_name = (name or "").strip()
        normalized_status = (status or "active").strip().lower()

        if not normalized_tenant_id:
            return {"error": "Tenant ID is required"}
        if not normalized_name:
            return {"error": "Tenant name is required"}
        if normalized_status not in {"active", "inactive"}:
            return {"error": "Invalid tenant status"}

        if SupabaseTenantManager._is_fallback_mode():
            if normalized_tenant_id in FALLBACK_TENANTS:
                return {"error": "Tenant already exists"}

            FALLBACK_TENANTS[normalized_tenant_id] = {
                "id": normalized_tenant_id,
                "name": normalized_name,
                "status": normalized_status,
                "created_at": "local-demo-tenant",
            }
            return {"success": True, "tenant": dict(FALLBACK_TENANTS[normalized_tenant_id])}

        try:
            existing = (
                supabase.table("tenants")
                .select("id")
                .eq("id", normalized_tenant_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                return {"error": "Tenant already exists"}

            response = (
                supabase.table("tenants")
                .insert(
                    {
                        "id": normalized_tenant_id,
                        "name": normalized_name,
                        "status": normalized_status,
                    }
                )
                .execute()
            )
            return {
                "success": True,
                "tenant": response.data[0] if response.data else None,
            }
        except Exception as e:
            return {"error": str(e)}
