alter table public.extractions
  add column if not exists risk_level text not null default 'LOW'
  check (risk_level in ('LOW', 'MEDIUM', 'HIGH'));