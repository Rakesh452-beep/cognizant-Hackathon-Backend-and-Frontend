from fastapi import APIRouter

from . import admin, applications, auth, notifications

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(applications.router)
api_router.include_router(admin.router)
api_router.include_router(notifications.router)