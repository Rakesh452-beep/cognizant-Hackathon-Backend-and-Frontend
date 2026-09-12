import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ...config import get_settings
from ...core.deps import CurrentUser, get_current_user, require_admin, require_reviewer
from ...core.exceptions import ConflictError, ForbiddenError, NotFoundError, UnprocessableError
from ...db.supabase import get_supabase
from ...schemas.application import (
    ApplicationCreate,
    ApplicationOut,
    DocumentOut,
    ExtractionOut,
    ReviewRequest,
    ReviewerAssignRequest,
)
from ...services import application_service, extraction_service, notification_service

router = APIRouter(prefix="/applications", tags=["applications"])

DOCUMENT_TYPES = {"PAYSLIP", "BANK_STATEMENT", "TAX_RETURN", "KYC", "OTHER"}


@router.post("", response_model=ApplicationOut, status_code=201)
def create_application(
    payload: ApplicationCreate,
    user: CurrentUser = Depends(get_current_user),
):
    app = application_service.create_application(user, payload)
    notification_service.notify_application_submitted(user.id, app["id"])
    notification_service.notify_reviewers_application_received(app["id"], user.id)
    return app


@router.get("", response_model=list[ApplicationOut])
def list_applications(user: CurrentUser = Depends(get_current_user)):
    return application_service.list_applications(user)


@router.get("/{application_id}", response_model=ApplicationOut)
def get_application(application_id: str, user: CurrentUser = Depends(get_current_user)):
    return application_service.get_application_for_user(application_id, user)


@router.post("/{application_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    user: CurrentUser = Depends(get_current_user),
):
    if document_type not in DOCUMENT_TYPES:
        raise UnprocessableError(f"document_type must be one of {sorted(DOCUMENT_TYPES)}")
    app = application_service.get_application_for_user(application_id, user)
    if app["applicant_id"] != user.id:
        raise ForbiddenError("Not your application")

    settings = get_settings()
    supabase = get_supabase()
    extension = (
        (file.filename or "file").rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    )
    file_path = f"{application_id}/{uuid.uuid4().hex}.{extension}"
    content = await file.read()
    classified_type = extraction_service.classify_document_type(file.filename, content, document_type)
    supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        file_path,
        content,
        {"content-type": file.content_type or "application/octet-stream"},
    )

    response = (
        supabase.table("documents")
        .insert(
            {
                "application_id": application_id,
                "document_type": classified_type,
                "file_name": file.filename,
                "file_path": file_path,
                "mime_type": file.content_type,
                "size_bytes": len(content),
                "uploaded_by": user.id,
            }
        )
        .execute()
    )
    uploaded_docs = (
        supabase.table("documents")
        .select("document_type")
        .eq("application_id", application_id)
        .execute()
    )
    uploaded_types = {item["document_type"] for item in (uploaded_docs.data or [])}
    if extraction_service.REQUIRED_DOCUMENT_TYPES.issubset(uploaded_types):
        extraction_service.process_application(application_id)
    return response.data[0]


@router.get("/{application_id}/documents", response_model=list[DocumentOut])
def list_documents(application_id: str, user: CurrentUser = Depends(get_current_user)):
    return application_service.list_application_documents(application_id, user)


@router.get("/{application_id}/summary", response_model=ExtractionOut)
def get_summary(application_id: str, user: CurrentUser = Depends(get_current_user)):
    return application_service.get_extraction_summary(application_id, user)


@router.post("/{application_id}/review", response_model=ApplicationOut)
def review_application(
    application_id: str,
    payload: ReviewRequest,
    user: CurrentUser = Depends(require_reviewer),
):
    app = application_service.review_application(application_id, user, payload)
    notification_service.notify_review_decision(
        app["applicant_id"], application_id, payload.decision, payload.notes
    )
    return app


@router.post("/{application_id}/process", response_model=ApplicationOut)
def process_application(
    application_id: str,
    user: CurrentUser = Depends(require_reviewer),
):
    return extraction_service.process_application(application_id)


@router.post("/{application_id}/assign", response_model=ApplicationOut)
def assign_reviewer(
    application_id: str,
    payload: ReviewerAssignRequest,
    admin: CurrentUser = Depends(require_admin),
):
    supabase = get_supabase()
    reviewer = (
        supabase.table("profiles")
        .select("id, role")
        .eq("id", payload.reviewer_id)
        .maybe_single()
        .execute()
    )
    if not reviewer or not reviewer.data:
        raise NotFoundError("Reviewer not found")
    if reviewer.data["role"] not in ("reviewer", "admin"):
        raise UnprocessableError("Target user is not a reviewer")

    app = application_service._get_application(application_id)
    response = (
        supabase.table("applications")
        .update({"assigned_reviewer_id": payload.reviewer_id})
        .eq("id", application_id)
        .execute()
    )
    if not response.data:
        raise ConflictError("Application could not be updated")
    notification_service.create_notification(
        payload.reviewer_id,
        "SYSTEM",
        "Application assigned for review",
        f"Application {application_id} has been assigned to you. Review it in the dashboard.",
        {"application_id": application_id, "action": "review"},
    )
    return response.data[0]


@router.post("/{application_id}/claim", response_model=ApplicationOut)
def claim_application(
    application_id: str,
    user: CurrentUser = Depends(require_reviewer),
):
    app = application_service._get_application(application_id)
    if app["status"] != "PENDING":
        raise ConflictError("Only pending applications can be claimed")
    if app.get("assigned_reviewer_id") not in (None, user.id):
        raise ForbiddenError("Application already assigned to another reviewer")
    response = (
        get_supabase()
        .table("applications")
        .update({"assigned_reviewer_id": user.id})
        .eq("id", application_id)
        .execute()
    )
    if not response.data:
        raise ConflictError("Application could not be updated")
    return response.data[0]