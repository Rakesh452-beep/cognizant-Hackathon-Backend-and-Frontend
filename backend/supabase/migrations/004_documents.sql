create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_type public.document_type not null,
  file_name text,
  file_path text,
  mime_type text,
  size_bytes bigint,
  status public.document_status not null default 'UPLOADED',
  uploaded_by uuid references public.profiles(id) on delete set null,
  extracted_fields jsonb,
  created_at timestamptz not null default now()
);

create index documents_application_idx on public.documents(application_id);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  raw jsonb,
  inconsistencies jsonb not null default '[]',
  missing_documents jsonb not null default '[]',
  summary text,
  confidence numeric(5, 4),
  created_at timestamptz not null default now()
);

create index extractions_application_idx on public.extractions(application_id, created_at desc);