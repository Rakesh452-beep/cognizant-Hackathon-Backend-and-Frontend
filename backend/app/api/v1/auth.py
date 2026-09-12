from fastapi import APIRouter, Depends

from ...core.deps import CurrentUser, get_current_user
from ...schemas.auth import (
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from ...services import auth_service, notification_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(payload: SignupRequest):
    user = auth_service.signup_user(payload)
    notification_service.create_notification(
        user["id"],
        "SYSTEM",
        "Welcome to Loan Document Agent",
        "Your account has been created.",
        send_email=False,
    )
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": payload.full_name,
        "role": "applicant",
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    return auth_service.login_user(str(payload.email), payload.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    return auth_service.refresh_session(payload.refresh_token)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }