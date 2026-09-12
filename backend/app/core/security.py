import uuid

import jwt as pyjwt
from jwt import InvalidTokenError, PyJWKClient

from ..config import get_settings
from ..core.exceptions import UnauthorizedError

_backend_jwks: PyJWKClient | None = None


def _get_jwks() -> PyJWKClient:
    global _backend_jwks
    if _backend_jwks is None:
        settings = get_settings()
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _backend_jwks = PyJWKClient(url, cache_keys=True)
    return _backend_jwks


def decode_access_token(token: str) -> str:
    settings = get_settings()
    try:
        alg = pyjwt.get_unverified_header(token).get("alg")
    except InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    try:
        if alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise UnauthorizedError("JWT secret not configured")
            payload = pyjwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        elif alg == "ES256":
            signing_key = _get_jwks().get_signing_key_from_jwt(token)
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
        else:
            raise UnauthorizedError(f"Unsupported token algorithm: {alg}")
    except UnauthorizedError:
        raise
    except InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Token missing subject")
    try:
        return str(uuid.UUID(sub))
    except ValueError as exc:
        raise UnauthorizedError("Invalid token subject") from exc