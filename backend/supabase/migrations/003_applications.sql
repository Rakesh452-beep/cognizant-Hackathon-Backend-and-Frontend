create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  assigned_reviewer_id uuid references public.profiles(id) on delete set null,
  status public.application_status not null default 'PENDING',
  loan_amount numeric(12, 2),
  loan_purpose text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_applicant_idx on public.applications(applicant_id);
create index applications_reviewer_idx on public.applications(assigned_reviewer_id);
create index applications_status_idx on public.applications(status);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute procedure public.set_updated_at();