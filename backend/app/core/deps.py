from dataclasses import dataclass
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..core.exceptions import ForbiddenError, UnauthorizedError
from ..core.security import decode_access_token
from ..db.supabase import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)

ROLES = ("applicant", "reviewer", "admin")


@dataclass
class CurrentUser:
    id: str
    email: str
    full_name: str
    role: str


def _load_profile(user_id: str) -> dict:
    supabase = get_supabase()
    response = supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not response or not response.data:
        raise UnauthorizedError("User profile not found")
    return response.data


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise UnauthorizedError("Missing bearer token")
    user_id = decode_access_token(credentials.credentials)
    profile = _load_profile(user_id)
    return CurrentUser(
        id=profile["id"],
        email=profile["email"],
        full_name=profile.get("full_name", ""),
        role=profile["role"],
    )


def require_roles(*roles: str):
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise ForbiddenError(f"Requires role: {' or '.join(roles)}")
        return user

    return _checker


require_applicant = require_roles("applicant")
require_reviewer = require_roles("reviewer", "admin")
require_admin = require_roles("admin")