from typing import Any, Dict, Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    body: Optional[str] = None
    metadata: Dict[str, Any] = {}
    read: bool = False
    created_at: Optional[str] = None


class NotificationCreate(BaseModel):
    user_id: str
    type: str = "SYSTEM"
    title: str
    body: Optional[str] = None
    metadata: Dict[str, Any] = {}