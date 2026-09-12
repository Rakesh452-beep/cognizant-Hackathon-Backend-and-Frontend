from typing import Literal

from pydantic import BaseModel, Field

from .auth import UserOut


class UpdateRoleRequest(BaseModel):
    user_id: str
    role: Literal["applicant", "reviewer", "admin"]


class AdminUsersOut(BaseModel):
    users: list[UserOut]
    total: int