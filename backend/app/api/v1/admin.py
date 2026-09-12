from typing import Optional

from fastapi import APIRouter, Depends

from ...core.deps import CurrentUser, require_admin
from ...db.supabase import get_supabase
from ...schemas.admin import AdminUsersOut, UpdateRoleRequest

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=AdminUsersOut)
def list_users(
    role: Optional[str] = None,
    user: CurrentUser = Depends(require_admin),
):
    supabase = get_supabase()
    query = supabase.table("profiles").select("*").order("created_at", desc=True)
    if role:
        query = query.eq("role", role)
    response = query.execute()
    return {"users": response.data, "total": len(response.data)}


@router.put("/users/{user_id}/role", response_model=AdminUsersOut)
def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    admin: CurrentUser = Depends(require_admin),
):
    supabase = get_supabase()
    response = (
        supabase.table("profiles")
        .update({"role": payload.role})
        .eq("id", user_id)
        .execute()
    )
    return {"users": response.data, "total": len(response.data)}