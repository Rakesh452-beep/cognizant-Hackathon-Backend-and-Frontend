from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 500
    error_code = "INTERNAL_ERROR"

    def __init__(self, message: str = "Internal server error"):
        self.message = message
        super().__init__(message)


class UnauthorizedError(AppError):
    status_code = 401
    error_code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status_code = 403
    error_code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    error_code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    error_code = "CONFLICT"


class UnprocessableError(AppError):
    status_code = 422
    error_code = "VALIDATION_ERROR"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"status": "error", "code": exc.error_code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"status": "error", "code": "INTERNAL_ERROR", "message": "Unexpected server error"},
        )