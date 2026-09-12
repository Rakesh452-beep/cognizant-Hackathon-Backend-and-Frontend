from datetime import datetime, timezone

from ..core.deps import CurrentUser
from ..core.exceptions import ConflictError, ForbiddenError, NotFoundError
from ..db.supabase import get_supabase
from ..schemas.application import ApplicationCreate, ReviewRequest


def _get_application(app_id: str) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table("applications")
        .select("*")
        .eq("id", app_id)
        .maybe_single()
        .execute()
    )
    if not response or not response.data:
        raise NotFoundError("Application not found")
    return response.data


def get_application_for_user(app_id: str, user: CurrentUser) -> dict:
    app = _get_application(app_id)
    if user.role == "applicant" and app["applicant_id"] != user.id:
        raise ForbiddenError("Not your application")
    if user.role == "reviewer":
        is_assigned = app.get("assigned_reviewer_id") == user.id
        is_pending = app.get("status") == "PENDING"
        if app["applicant_id"] != user.id and not is_assigned and not is_pending:
            raise ForbiddenError("Application not assigned to you")
    return app


def create_application(user: CurrentUser, payload: ApplicationCreate) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table("applications")
        .insert(
            {
                "applicant_id": user.id,
                "loan_amount": payload.loan_amount,
                "loan_purpose": payload.loan_purpose,
                "status": "PENDING",
            }
        )
        .execute()
    )
    app = response.data[0]
    return app


def list_applications(user: CurrentUser) -> list:
    supabase = get_supabase()
    if user.role == "applicant":
        response = (
            supabase.table("applications")
            .select("*")
            .eq("applicant_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
    elif user.role == "admin":
        response = (
            supabase.table("applications")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
    else:
        response = (
            supabase.table("applications")
            .select("*")
            .or_(f"assigned_reviewer_id.eq.{user.id},status.eq.PENDING")
            .order("created_at", desc=True)
            .execute()
        )
    return response.data


def list_application_documents(app_id: str, user: CurrentUser) -> list:
    get_application_for_user(app_id, user)
    supabase = get_supabase()
    response = (
        supabase.table("documents")
        .select("*")
        .eq("application_id", app_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def get_extraction_summary(app_id: str, user: CurrentUser) -> dict:
    app = get_application_for_user(app_id, user)
    if user.role == "applicant" and app["applicant_id"] != user.id:
        raise ForbiddenError("Not your application")
    supabase = get_supabase()
    response = (
        supabase.table("extractions")
        .select("*")
        .eq("application_id", app_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        return {
            "application_id": app_id,
            "status": app["status"],
            "summary_ready": False,
        }
    extraction = response.data[0]
    return {
        "application_id": app_id,
        "status": app["status"],
        "summary_ready": True,
        "summary": extraction.get("summary"),
        "inconsistencies": extraction.get("inconsistencies", []),
        "missing_documents": extraction.get("missing_documents", []),
        "confidence": extraction.get("confidence"),
        "risk_level": extraction.get("risk_level"),
        "extracted_fields": extraction.get("raw", {}),
    }


def review_application(app_id: str, user: CurrentUser, payload: ReviewRequest) -> dict:
    app = _get_application(app_id)
    if user.role != "admin" and app.get("assigned_reviewer_id") not in (None, user.id):
        raise ForbiddenError("Application assigned to another reviewer")

    supabase = get_supabase()
    update = {
        "status": payload.decision,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "review_notes": payload.notes,
        "assigned_reviewer_id": user.id,
    }
    response = (
        supabase.table("applications")
        .update(update)
        .eq("id", app_id)
        .execute()
    )
    if not response.data:
        raise ConflictError("Application could not be updated")
    return response.data[0]