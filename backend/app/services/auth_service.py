from ..core.exceptions import ConflictError, UnauthorizedError
from ..schemas.auth import SignupRequest


def _auth_client():
    from ..config import get_settings

    from supabase import create_client

    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def signup_user(payload: SignupRequest) -> dict:
    supabase = _auth_client()
    try:
        response = supabase.auth.admin.create_user(
            {
                "email": str(payload.email),
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": payload.full_name},
            }
        )
    except Exception as exc:
        raise ConflictError(f"Signup failed: {exc}") from exc
    user = response.user
    return {
        "id": user.id,
        "email": user.email,
    }


def login_user(email: str, password: str) -> dict:
    supabase = _auth_client()
    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:
        raise UnauthorizedError("Invalid email or password") from exc
    session = response.session
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": "bearer",
        "expires_at": session.expires_at,
    }


def refresh_session(refresh_token: str) -> dict:
    supabase = _auth_client()
    try:
        response = supabase.auth.refresh_session(refresh_token)
    except Exception as exc:
        raise UnauthorizedError("Invalid refresh token") from exc
    session = response.session
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": "bearer",
        "expires_at": session.expires_at,
    }