alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.extractions enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "applications_select" on public.applications
  for select using (
    auth.uid() = applicant_id
    or auth.uid() = assigned_reviewer_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('reviewer', 'admin'))
  );

create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = applicant_id);

create policy "documents_select" on public.documents
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id
        and (a.applicant_id = auth.uid()
             or a.assigned_reviewer_id = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('reviewer', 'admin')))
    )
  );

create policy "documents_insert" on public.documents
  for insert with check (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and a.applicant_id = auth.uid()
    )
  );

create policy "extractions_select" on public.extractions
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = extractions.application_id
        and (a.applicant_id = auth.uid()
             or a.assigned_reviewer_id = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('reviewer', 'admin')))
    )
  );

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);