from typing import Any, Optional

from ..config import get_settings
from ..core.exceptions import NotFoundError
from ..db.supabase import get_supabase

NOTIFICATION_TYPES = {
    "APPLICATION_SUBMITTED",
    "PROCESSING_STARTED",
    "SUMMARY_READY",
    "MISSING_DOCUMENTS",
    "REVIEW_DECISION",
    "SYSTEM",
}


def _get_profile_email(user_id: str) -> Optional[str]:
    supabase = get_supabase()
    response = (
        supabase.table("profiles")
        .select("email, role, full_name")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None


def create_notification(
    user_id: str,
    type_: str,
    title: str,
    body: Optional[str] = None,
    metadata: Optional[dict] = None,
    send_email: bool = True,
) -> dict:
    if type_ not in NOTIFICATION_TYPES:
        type_ = "SYSTEM"
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .insert(
            {
                "user_id": user_id,
                "type": type_,
                "title": title,
                "body": body,
                "metadata": metadata or {},
            }
        )
        .execute()
    )
    if response.data:
        if send_email:
            _send_email(user_id, title, body or "")
    return response.data[0]


def list_notifications(user_id: str) -> list:
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return response.data


def mark_notification_read(user_id: str, notification_id: str) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise NotFoundError("Notification not found")
    return response.data[0]


def mark_all_notifications_read(user_id: str) -> None:
    supabase = get_supabase()
    supabase.table("notifications").update({"read": True}).eq("user_id", user_id).execute()


def notify_application_submitted(user_id: str, application_id: str) -> None:
    create_notification(
        user_id,
        "APPLICATION_SUBMITTED",
        "Application submitted",
        "Your loan application has been submitted and is now in processing.",
        {"application_id": application_id, "status": "PENDING"},
    )


def notify_reviewers_application_received(application_id: str, applicant_id: str) -> None:
    """Notify every Loan Officer that a new verification case is waiting."""
    supabase = get_supabase()
    reviewers = (
        supabase.table("profiles")
        .select("id")
        .eq("role", "reviewer")
        .execute()
    ).data or []
    for reviewer in reviewers:
        create_notification(
            reviewer["id"],
            "APPLICATION_SUBMITTED",
            "New verification received",
            "A new applicant loan application is ready for document verification.",
            {
                "application_id": application_id,
                "applicant_id": applicant_id,
                "status": "PENDING",
                "action": "review",
            },
        )


def notify_processing_started(user_id: str, application_id: str) -> None:
    create_notification(
        user_id,
        "PROCESSING_STARTED",
        "Processing started",
        "Your documents are being reviewed by our processing agent.",
        {"application_id": application_id, "status": "PROCESSING"},
    )


def notify_summary_ready(reviewer_id: str, application_id: str) -> None:
    create_notification(
        reviewer_id,
        "SUMMARY_READY",
        "Processing summary ready for review",
        "A new loan processing summary is ready. Review the application and decide.",
        {"application_id": application_id, "status": "PROCESSED", "action": "review"},
    )


def notify_missing_documents(user_id: str, application_id: str, missing: list) -> None:
    create_notification(
        user_id,
        "MISSING_DOCUMENTS",
        "Documents missing or inconsistent",
        f"Please provide the following: {', '.join(str(d) for d in missing)}",
        {"application_id": application_id, "missing_documents": missing},
    )


def notify_review_decision(user_id: str, application_id: str, decision: str, notes: str = "") -> None:
    create_notification(
        user_id,
        "REVIEW_DECISION",
        f"Application {decision.replace('_', ' ').title()}",
        notes or f"Your application has been {decision.replace('_', ' ').lower()}.",
        {"application_id": application_id, "decision": decision, "notes": notes},
    )


def _send_email(user_id: str, title: str, body: str) -> None:
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        return
    profile = _get_profile_email(user_id)
    if not profile:
        return
    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.REVIEWER_DEFAULT_EMAIL or "Loan Agent <onboarding@resend.dev>",
                "to": [profile["email"]],
                "subject": title,
                "text": body,
            }
        )
    except Exception:
        pass