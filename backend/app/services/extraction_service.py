import re
from datetime import datetime, timezone

from ..config import get_settings
from ..core.exceptions import NotFoundError
from ..db.supabase import get_supabase
from . import notification_service

REQUIRED_DOCUMENT_TYPES = {"PAYSLIP", "BANK_STATEMENT", "TAX_RETURN", "KYC"}

_MONEY_LABELS = re.compile(
    r"(?:Net Pay|Net Salary|Net Monthly Salary|Take[- ]Home|[Gg]ross(?: Salary| Pay| Income| Monthly Salary)"
    r"|Salary Credit(?:ed)?|Total Credit|Closing Balance|Average Balance"
    r"|Tax Returned|Tax Paid|Total Income|Income From Salary|Declared Annual Income)"
    r"[^\n]{0,60}?(?P<value>[\u20b9$€£■]?\s?[\d,]+\.?\d{0,2})",
    re.IGNORECASE,
)

_NAME_LABELS = re.compile(r"(?:Name|Employee Name|Account Holder)[:\s-]{1,4}([A-Z][A-Za-z .'-]+)", re.IGNORECASE)

_PERIOD_LABELS = re.compile(r"(?:Period|Pay Period|Payslip Period|Month)[:\s-]{1,4}([A-Za-z]{3,9}\s?\d{4}|[A-Za-z]{3,9}[ ,-]?\d{1,2}[, ]?\d{4})", re.IGNORECASE)

_NUMERIC = re.compile(r"\d+(?:\.\d{1,2})?")


def _to_float(raw: str) -> float | None:
    cleaned = raw.replace(",", "").replace(" ", "").strip()
    match = _NUMERIC.search(cleaned)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def _extract_money(text: str, labels: str | None = None) -> float | None:
    pattern = _MONEY_LABELS if labels is None else re.compile(
        rf"(?:{labels})[^\n]{{0,60}}?(?P<value>[\u20b9$€£■]?\s?[\d,]+\.?\d{{0,2}})", re.IGNORECASE
    )
    match = pattern.search(text or "")
    if not match:
        return None
    return _to_float(match.group("value"))


def _clean_number(value: float) -> float:
    return round(value, 2)


def _decode_content(content: bytes) -> str:
    if not content:
        return ""
    if content.startswith(b"%PDF"):
        try:
            from pypdf import PdfReader
            from io import BytesIO

            reader = PdfReader(BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    for encoding in ("utf-8", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return ""


def _extract_name(text: str, filename: str) -> str | None:
    match = _NAME_LABELS.search(text or "")
    if match:
        return match.group(1).strip()
    return None


def _extract_period(text: str) -> str | None:
    match = _PERIOD_LABELS.search(text or "")
    if match:
        return match.group(1).strip()
    return None


def _extract_fields(document_type: str, content: str) -> dict:
    if not content:
        return {}
    if document_type == "PAYSLIP":
        fields: dict = {"net_income": None, "gross_income": None, "employee_name": None, "payslip_period": None}
        net_income = _extract_money(content, "Net Monthly Salary|Net Pay|Net Salary")
        gross_income = _extract_money(content, "Gross Monthly Salary|Gross Salary|Gross Pay|Gross Income")
        if net_income is not None:
            fields["net_income"] = _clean_number(net_income)
        if gross_income is not None:
            fields["gross_income"] = _clean_number(gross_income)
        fields["employee_name"] = _extract_name(content, "")
        fields["payslip_period"] = _extract_period(content)
        return {k: v for k, v in fields.items() if v is not None}
    if document_type == "BANK_STATEMENT":
        fields = {"credits_total": None, "closing_balance": None, "account_holder": None}
        credits = _extract_money(content, "Salary Credit|Salary Credited|Total Credit")
        closing = _extract_money(content, "Closing Balance")
        if credits is not None:
            fields["credits_total"] = _clean_number(credits)
        if closing is not None:
            fields["closing_balance"] = _clean_number(closing)
        fields["account_holder"] = _extract_name(content, "")
        return {k: v for k, v in fields.items() if v is not None}
    if document_type == "TAX_RETURN":
        fields = {"gross_income": None, "tax_paid": None, "taxpayer_name": None}
        income = _extract_money(content, "Declared Annual Income|Total Income|Income From Salary")
        tax_paid = _extract_money(content, "Tax Paid|Tax Returned")
        if income is not None:
            fields["gross_income"] = _clean_number(income)
        if tax_paid is not None:
            fields["tax_paid"] = _clean_number(tax_paid)
        fields["taxpayer_name"] = _extract_name(content, "")
        return {k: v for k, v in fields.items() if v is not None}
    if document_type == "KYC":
        fields = {"kyc_name": None, "kyc_id": None}
        name = _extract_name(content, "")
        if name:
            fields["kyc_name"] = name
        match = re.search(r"(?:Document Number|KYC Number)[:\s-]+([^\n]+)", content, re.IGNORECASE)
        if match:
            fields["kyc_id"] = match.group(1).strip()
        return {k: v for k, v in fields.items() if v is not None}
    return {}


def classify_document_type(file_name: str | None, content: bytes, declared_type: str = "OTHER") -> str:
    """Classify common loan documents using filename and readable document text."""
    haystack = f"{file_name or ''} {_decode_content(content)}".lower()
    candidates = (
        ("BANK_STATEMENT", ("bank statement", "account holder", "closing balance", "transaction")),
        ("TAX_RETURN", ("tax return", "income tax", "taxpayer", "tax paid", "itr")),
        ("PAYSLIP", ("payslip", "pay slip", "net pay", "gross salary", "salary credited")),
        ("KYC", ("know your customer", "kyc", "aadhaar", "passport", "identity", "pan card")),
    )
    scores = {document_type: sum(1 for marker in markers if marker in haystack) for document_type, markers in candidates}
    best_type, best_score = max(scores.items(), key=lambda item: item[1])
    return best_type if best_score else declared_type


def _download_document(doc: dict) -> bytes:
    settings = get_settings()
    if not doc.get("file_path"):
        return b""
    try:
        supabase = get_supabase()
        data = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).download(doc["file_path"])
        return data or b""
    except Exception:
        return b""


def _compute_inconsistencies(documents: list, extracted: dict) -> list:
    inconsistencies: list = []
    for doc in documents:
        if doc.get("status") == "INVALID":
            inconsistencies.append(
                f"Could not reliably extract data from {doc.get('file_name', 'document')} ({doc['document_type']})."
            )
    incomes = []
    for doc in documents:
        fields = extracted.get(doc["id"], {})
        for key in ("net_income", "gross_income"):
            if fields.get(key) is not None and fields[key] > 0:
                incomes.append((doc["document_type"], fields[key]))
    for i in range(len(incomes)):
        for j in range(i + 1, len(incomes)):
            type_a, val_a = incomes[i]
            type_b, val_b = incomes[j]
            if val_a <= 0 or val_b <= 0:
                continue
            diff = abs(val_a - val_b) / max(val_a, val_b)
            if diff > 0.1:
                inconsistencies.append(
                    f"Income reported in {type_a} ({val_a:.2f}) differs from {type_b} ({val_b:.2f}) by more than 10%."
                )
    return inconsistencies


def _missing_documents(documents: list) -> list:
    uploaded = {doc["document_type"] for doc in documents if doc.get("status") != "MISSING"}
    return sorted(REQUIRED_DOCUMENT_TYPES - uploaded)


def _risk_level(missing: list, inconsistencies: list, invalid_count: int) -> str:
    issue_count = len(missing) + len(inconsistencies) + invalid_count
    if issue_count >= 3:
        return "HIGH"
    if issue_count:
        return "MEDIUM"
    return "LOW"


def _build_summary(documents: list, extracted: dict, missing: list, inconsistencies: list, risk_level: str) -> str:
    lines = [
        f"Documents {'complete' if not missing else 'incomplete'} | "
        f"{'No inconsistencies detected' if not inconsistencies else f'{len(inconsistencies)} inconsistency detected'} | "
        f"{risk_level.title()} Risk",
        "Extracted financial profile from uploaded documents:",
    ]
    for doc in documents:
        fields = extracted.get(doc["id"], {})
        if not fields:
            continue
        rendered = ", ".join(f"{k.replace('_', ' ')}: {v}" for k, v in fields.items())
        lines.append(f"- {doc['document_type']}: {rendered}")
    if inconsistent := [d for d in documents if d.get("status") == "INVALID"]:
        lines.append(
            f"- Unreadable: {', '.join(d.get('file_name', d['document_type']) for d in inconsistent)}"
        )
    if missing:
        lines.append(f"- Missing documents: {', '.join(missing)}")
    if inconsistencies:
        lines.append("- Flags: " + "; ".join(inconsistencies))
    return "\n".join(lines)


def process_application(app_id: str) -> dict:
    supabase = get_supabase()
    app_resp = (
        supabase.table("applications")
        .select("*")
        .eq("id", app_id)
        .maybe_single()
        .execute()
    )
    if not app_resp or not app_resp.data:
        raise NotFoundError("Application not found")
    app = app_resp.data

    if app["status"] in ("PENDING", "NEEDS_MORE_INFO"):
        supabase.table("applications").update({"status": "PROCESSING"}).eq("id", app_id).execute()
        notification_service.notify_processing_started(app["applicant_id"], app_id)

    docs_resp = (
        supabase.table("documents")
        .select("*")
        .eq("application_id", app_id)
        .execute()
    )
    documents = docs_resp.data or []

    extracted: dict = {}
    valid_count = 0
    for doc in documents:
        content = _decode_content(_download_document(doc))
        fields = _extract_fields(doc["document_type"], content)
        if fields:
            status = "VALID"
            valid_count += 1
        else:
            status = "INVALID"
        doc["status"] = status
        extracted[doc["id"]] = fields
        supabase.table("documents").update({"status": status, "extracted_fields": fields}).eq("id", doc["id"]).execute()

    missing = _missing_documents(documents)
    inconsistencies = _compute_inconsistencies(documents, extracted)

    confidence = 0.95 if valid_count > 0 else 0.0
    confidence -= 0.12 * len(missing)
    confidence -= 0.08 * sum(1 for doc in documents if doc.get("status") == "INVALID")
    confidence = round(min(0.99, max(0.2, confidence)), 4)
    risk_level = _risk_level(missing, inconsistencies, sum(1 for doc in documents if doc.get("status") == "INVALID"))
    summary = _build_summary(documents, extracted, missing, inconsistencies, risk_level)

    insert_resp = (
        supabase.table("extractions")
        .insert(
            {
                "application_id": app_id,
                "raw": extracted,
                "inconsistencies": inconsistencies,
                "missing_documents": missing,
                "summary": summary,
                "confidence": confidence,
                "risk_level": risk_level,
            }
        )
        .execute()
    )

    if missing:
        new_status = "NEEDS_MORE_INFO"
    else:
        new_status = "PROCESSED"

    final_resp = (
        supabase.table("applications")
        .update({"status": new_status})
        .eq("id", app_id)
        .execute()
    )

    if missing:
        notification_service.notify_missing_documents(app["applicant_id"], app_id, missing)
    else:
        reviewer_id = app.get("assigned_reviewer_id")
        if reviewer_id:
            notification_service.notify_summary_ready(reviewer_id, app_id)
        notification_service.notify_summary_ready(app["applicant_id"], app_id)

    return final_resp.data[0] if final_resp.data else {**app, "status": new_status}