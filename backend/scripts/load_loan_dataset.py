import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.db.supabase import get_supabase

DEFAULT_PACKAGE = Path(__file__).resolve().parents[2] / "loan_document_processing_dataset"
DEFAULT_CSV = DEFAULT_PACKAGE / "loan_approval_dataset.csv"
DEFAULT_METADATA = DEFAULT_PACKAGE / "document_metadata.csv"
DEFAULT_DOCUMENTS = DEFAULT_PACKAGE / "synthetic_loan_documents"
BATCH_SIZE = 200
PASSWORD = "demo-pass-123"

STATUS_ALLOWED = {"PENDING", "PROCESSING", "PROCESSED", "NEEDS_MORE_INFO", "APPROVED", "REJECTED"}


def _ensure_applicant(supabase, index: int, applicant_reference: str) -> str:
    email = f"dataset+{index}@demo.com"
    full_name = f"{applicant_reference} Synthetic Applicant"
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("email", email)
        .maybe_single()
        .execute()
    )
    if existing:
        return existing.data["id"]
    created = supabase.auth.admin.create_user(
        {
            "email": email,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        }
    )
    return created.user.id


def _row_to_application(row: dict, applicant_id: str, status: str) -> dict:
    self_employed = str(row["self_employed"]).strip().lower() in ("yes", "true", "1")
    return {
        "applicant_id": applicant_id,
        "loan_amount": float(row["loan_amount"]) if row["loan_amount"] else None,
        "loan_purpose": f"Dataset loan {row['loan_id']}",
        "loan_term": int(row["loan_term"]) if row["loan_term"] else None,
        "no_of_dependents": int(row["no_of_dependents"]) if row["no_of_dependents"] else None,
        "education": str(row["education"]).strip() or None,
        "self_employed": self_employed,
        "income_annum": float(row["income_annum"]) if row["income_annum"] else None,
        "cibil_score": int(row["cibil_score"]) if row["cibil_score"] else None,
        "residential_assets_value": float(row["residential_assets_value"]) if row["residential_assets_value"] else None,
        "commercial_assets_value": float(row["commercial_assets_value"]) if row["commercial_assets_value"] else None,
        "luxury_assets_value": float(row["luxury_assets_value"]) if row["luxury_assets_value"] else None,
        "bank_asset_value": float(row["bank_asset_value"]) if row["bank_asset_value"] else None,
        "status": status,
    }


def _read_rows(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [{str(k).strip(): (str(v).strip() if v is not None else None) for k, v in raw.items()} for raw in reader]


def load(
    csv_path: str,
    metadata_path: str,
    documents_root: str,
    limit: int | None,
    status: str,
    dry_run: bool,
    process_documents: bool,
) -> None:
    if status not in STATUS_ALLOWED:
        print(f"Invalid status {status!r}. Allowed: {sorted(STATUS_ALLOWED)}")
        sys.exit(1)

    path = Path(csv_path)
    if not path.exists():
        print(f"CSV not found: {path}")
        sys.exit(1)

    rows = _read_rows(path)
    metadata = _read_rows(Path(metadata_path))

    if limit:
        rows = rows[:limit]

    if dry_run:
        print(f"[dry-run] {len(rows)} rows would be loaded with status={status}")
        sample = _row_to_application(rows[0], "<applicant_id>", status)
        print(f"[dry-run] sample application payload: {sample}")
        return

    supabase = get_supabase()
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.")
        sys.exit(1)

    document_root = Path(documents_root)
    applicants = {}
    for row in rows:
        loan_id = int(row["loan_id"])
        reference = f"APPLICANT-{loan_id:04d}"
        applicants[loan_id] = _ensure_applicant(supabase, loan_id, reference)
    print(f"Applicant users ready: {len(applicants)} (password: {PASSWORD})")

    existing_apps = []
    for loan_id, applicant_id in applicants.items():
        existing = (
            supabase.table("applications")
            .select("id, applicant_id, loan_amount, loan_purpose")
            .eq("applicant_id", applicant_id)
            .eq("loan_purpose", f"Dataset loan {loan_id}")
            .limit(1)
            .execute()
        ).data or []
        existing_apps.extend(existing)
    existing_keys = {(item["applicant_id"], item.get("loan_purpose")) for item in existing_apps}
    inserted = 0
    batch = []
    for index, row in enumerate(rows):
        applicant_id = applicants[int(row["loan_id"])]
        loan_purpose = f"Dataset loan {row['loan_id']}"
        if (applicant_id, loan_purpose) in existing_keys:
            continue
        batch.append(_row_to_application(row, applicant_id, status))
        existing_keys.add((applicant_id, loan_purpose))
        if len(batch) >= BATCH_SIZE:
            supabase.table("applications").insert(batch).execute()
            inserted += len(batch)
            batch = []
            print(f"  inserted {inserted}/{len(rows)}")
    if batch:
        supabase.table("applications").insert(batch).execute()
        inserted += len(batch)
        print(f"  inserted {inserted}/{len(rows)}")

    print(f"Done. {inserted} applications loaded (status={status}).")

    application_rows = []
    for loan_id, applicant_id in applicants.items():
        existing = (
            supabase.table("applications")
            .select("id, applicant_id, loan_amount, loan_purpose")
            .eq("applicant_id", applicant_id)
            .eq("loan_purpose", f"Dataset loan {loan_id}")
            .limit(1)
            .execute()
        ).data or []
        application_rows.extend(existing)
    app_by_loan = {item["loan_purpose"]: item for item in application_rows}
    selected_loan_ids = {int(row["loan_id"]) for row in rows}
    metadata = [item for item in metadata if int(item["loan_id"]) in selected_loan_ids]
    document_count = 0
    existing_documents = []
    for application in application_rows:
        existing_documents.extend(
            (
                supabase.table("documents")
                .select("application_id, file_name")
                .eq("application_id", application["id"])
                .execute()
            ).data or []
        )
    existing_document_keys = {(item["application_id"], item["file_name"]) for item in existing_documents}
    for item in metadata:
        loan_id = int(item["loan_id"])
        application = app_by_loan.get(f"Dataset loan {loan_id}")
        source = document_root / item["file_name"]
        if not application or not source.exists():
            continue
        if (application["id"], source.name) in existing_document_keys:
            continue
        content = source.read_bytes()
        storage_path = f"dataset/{application['id']}/{source.name}"
        supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            storage_path, content, {"content-type": "application/pdf", "upsert": "true"}
        )
        supabase.table("documents").insert(
            {
                "application_id": application["id"],
                "document_type": item["document_type"].upper().replace(" ", "_"),
                "file_name": source.name,
                "file_path": storage_path,
                "mime_type": "application/pdf",
                "size_bytes": len(content),
                "uploaded_by": application["applicant_id"],
            }
        ).execute()
        document_count += 1
        existing_document_keys.add((application["id"], source.name))
    print(f"Documents loaded: {document_count}")

    if process_documents:
        from app.services.extraction_service import process_application

        for application in application_rows:
            process_application(application["id"])
        print(f"AI processing completed for {len(application_rows)} applications")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load the synthetic loan document processing package into Supabase")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Path to loan_approval_dataset.csv")
    parser.add_argument("--metadata", default=str(DEFAULT_METADATA), help="Path to document_metadata.csv")
    parser.add_argument("--documents-root", default=str(DEFAULT_DOCUMENTS), help="Root synthetic_loan_documents directory")
    parser.add_argument("--limit", type=int, default=None, help="Only load the first N rows")
    parser.add_argument("--status", default="PENDING", help="Status to set on loaded applications")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to Supabase")
    parser.add_argument("--process-documents", action="store_true", help="Run extraction and validation after importing PDFs")
    args = parser.parse_args()
    load(args.csv, args.metadata, args.documents_root, args.limit, args.status, args.dry_run, args.process_documents)