create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null default 'SYSTEM',
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);

alter publication supabase_realtime add table public.notifications;