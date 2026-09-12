# Loan Document Agent - Backend API

AI-assisted loan document processing backend. FastAPI + Supabase (auth, Postgres, storage).

## Stack

- **API**: FastAPI (Python 3.11), pydantic v2, uvicorn
- **Database/Auth/Storage**: Supabase (Postgres + Row Level Security, Auth, Storage bucket)
- **Emails**: Resend (optional)
- **Roles**: `applicant`, `reviewer`, `admin`

## Run full-stack (backend + frontend)

Backend (`backend/`, terminal 1):

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Frontend (`frontend/frontend/`, terminal 2):

```powershell
npm install      # first time only
npm run dev      # http://localhost:5173
```

Vite proxies `/api` -> `http://localhost:8000`, so the browser talks to your backend
with no CORS setup (backend CORS allows `http://localhost:5173` too).

## Features

- Signup / login / refresh / me (Supabase Auth, JWT)
- Applications: create, list, view, upload documents, processing summary
- **Document processing agent**: validates uploaded docs, extracts key financial fields
  (net income, balances, tax figures), flags inconsistencies and missing documents,
  writes an `extractions` row, and fires notifications
- Reviewer workflow: admin assigns (or reviewer self-claims) pending applications, then
  approves / rejects / requests more info
- Notifications: in-app (realtime-enabled table) + optional email via Resend

## Project layout

```
backend/
├── app/
│   ├── main.py                 # FastAPI app factory (+ /health)
│   ├── config.py               # pydantic-settings (reads .env)
│   ├── api/v1/                 # auth, applications, admin, notifications routers
│   ├── core/                   # deps (JWT -> profile/roles), security, exceptions
│   ├── db/                     # supabase client (service role)
│   ├── schemas/                # pydantic request/response models
│   └── services/
│       ├── auth_service.py
│       ├── application_service.py
│       ├── extraction_service.py   # document processing agent
│       └── notification_service.py
├── scripts/seed_demo_users.py  # creates demo applicant/reviewer/admin
├── supabase/migrations/        # 001..006 SQL DDL + RLS
└── requirements.txt
```

## Setup

### 1. Supabase project

1. Create a project at https://supabase.com
2. Create a storage bucket named `documents`
3. Collect from **Project Settings -> API**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - JWT secret (Project Settings -> API -> JWT settings)

### 2. Apply migrations

Run the SQL files in `supabase/migrations/` in order via the Supabase SQL editor
(or `supabase db push` if you have the CLI linked).

### 3. Environment

```powershell
Copy-Item .env.example .env
```

Then fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
`RESEND_API_KEY` / `REVIEWER_DEFAULT_EMAIL` are optional (emails are skipped when missing).

### 4. Install and run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\seed_demo_users.py     # creates demo users
uvicorn app.main:app --reload
```

Health check: http://localhost:8000/health · Swagger: http://localhost:8000/docs

## Demo users

| Role       | Email                 | Password     |
| ---------- | --------------------- | ------------ |
| applicant  | applicant@demo.com    | demo-pass-123 |
| reviewer   | reviewer@demo.com     | demo-pass-123 |
| admin      | admin@demo.com        | demo-pass-123 |

## Loading the synthetic loan document dataset

`loan_document_processing_dataset/` contains the supplied loan CSV, document metadata,
and 400 synthetic PDFs linked to 100 loan IDs. The loader creates one synthetic applicant
per loan, maps the application fields, uploads the four PDFs to Supabase Storage, and creates
the matching document rows.

```powershell
python scripts\load_loan_dataset.py --limit 2 --dry-run
python scripts\load_loan_dataset.py --limit 100 --status PENDING
python scripts\load_loan_dataset.py --limit 100 --status PENDING --process-documents
```

The loader creates accounts such as `dataset+1@demo.com` through `dataset+100@demo.com`,
all with password `demo-pass-123`. Run `007_loan_dataset_fields.sql` and ensure the
`documents` storage bucket exists before loading. Use `--process-documents` to run PDF
extraction and validation immediately after import; otherwise the applications remain
pending for the normal reviewer workflow.

## API overview

All routes except `/health` and `/auth/signup|login|refresh` require a bearer token.

```
POST /api/v1/auth/signup         create account (default role: applicant)
POST /api/v1/auth/login          -> access/refresh token
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

POST /api/v1/applications                        create application
GET  /api/v1/applications                        list (scoped by role)
GET  /api/v1/applications/{id}                   get by id
POST /api/v1/applications/{id}/documents         upload document (multipart)
GET  /api/v1/applications/{id}/documents         list documents
GET  /api/v1/applications/{id}/summary           latest extraction summary
POST /api/v1/applications/{id}/process           run document processing (reviewer/admin)
POST /api/v1/applications/{id}/assign            admin assigns reviewer  {reviewer_id}
POST /api/v1/applications/{id}/claim             reviewer self-claims pending app
POST /api/v1/applications/{id}/review            {decision, notes} (reviewer/admin)

GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
POST  /api/v1/notifications/read-all

GET  /api/v1/admin/users?role=reviewer              (admin)
PUT  /api/v1/admin/users/{id}/role                  {role, ...} (admin)
```

### Processing flow

1. Applicant creates an application and uploads `PAYSLIP`, `BANK_STATEMENT`, `TAX_RETURN`, and `KYC`.
2. Reviewer/admin calls `POST /applications/{id}/process`.
3. The agent downloads each document from the bucket, heuristically extracts key fields,
   marks each document `VALID`/`INVALID`, and writes inconsistencies + missing docs + a summary
   to the `extractions` table.
4. If required docs are missing -> application becomes `NEEDS_MORE_INFO` (applicant notified).
   Otherwise it becomes `PROCESSED` and the reviewer is notified the summary is ready.
5. Reviewer reviews -> `APPROVED` / `REJECTED` / `NEEDS_MORE_INFO`; applicant is notified.

> The extractor is intentionally heuristic so the demo runs without an external AI key.
> Swap `extraction_service.py::_extract_fields` with an LLM/doc-parsing call to upgrade it.

## Email notifications (optional)

Set `RESEND_API_KEY` and `REVIEWER_DEFAULT_EMAIL`. Notification rows are created
regardless; emails are sent best-effort and failures are swallowed.

## Tests

```powershell
pip install -r requirements-dev.txt
pytest
```