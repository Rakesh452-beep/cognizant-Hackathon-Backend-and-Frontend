from fastapi import APIRouter, Depends

from ...core.deps import CurrentUser, get_current_user, require_admin
from ...schemas.notification import NotificationCreate, NotificationOut
from ...services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(user: CurrentUser = Depends(get_current_user)):
    return notification_service.list_notifications(user.id)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    return notification_service.mark_notification_read(user.id, notification_id)


@router.post("/read-all", status_code=204)
def mark_all_read(user: CurrentUser = Depends(get_current_user)):
    notification_service.mark_all_notifications_read(user.id)


@router.post("/test", response_model=NotificationOut)
def send_test_notification(
    payload: NotificationCreate,
    admin: CurrentUser = Depends(require_admin),
):
    return notification_service.create_notification(
        payload.user_id,
        payload.type,
        payload.title,
        payload.body,
        payload.metadata,
    )