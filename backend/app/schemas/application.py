from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class ApplicationCreate(BaseModel):
    loan_amount: Optional[float] = Field(default=None, ge=0)
    loan_purpose: Optional[str] = Field(default=None, max_length=500)


class ApplicationOut(BaseModel):
    id: str
    applicant_id: str
    assigned_reviewer_id: Optional[str] = None
    status: str
    loan_amount: Optional[float] = None
    loan_purpose: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    no_of_dependents: Optional[int] = None
    education: Optional[str] = None
    self_employed: Optional[bool] = None
    income_annum: Optional[float] = None
    loan_term: Optional[int] = None
    cibil_score: Optional[int] = None
    residential_assets_value: Optional[float] = None
    commercial_assets_value: Optional[float] = None
    luxury_assets_value: Optional[float] = None
    bank_asset_value: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    application_id: str
    document_type: str
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    status: str
    uploaded_by: Optional[str] = None
    created_at: Optional[str] = None


class ReviewRequest(BaseModel):
    decision: Literal["APPROVED", "REJECTED", "NEEDS_MORE_INFO"]
    notes: str = Field(default="", max_length=2000)


class ReviewerAssignRequest(BaseModel):
    reviewer_id: str


class ExtractionOut(BaseModel):
    application_id: str
    status: str
    summary_ready: bool = False
    summary: Optional[str] = None
    inconsistencies: List[Any] = []
    missing_documents: List[Any] = []
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    extracted_fields: Optional[dict] = None