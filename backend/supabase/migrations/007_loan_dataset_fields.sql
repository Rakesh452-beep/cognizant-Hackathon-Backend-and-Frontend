alter table public.applications
  add column no_of_dependents int,
  add column education text,
  add column self_employed boolean,
  add column income_annum numeric(14, 2),
  add column loan_term int,
  add column cibil_score int,
  add column residential_assets_value numeric(14, 2),
  add column commercial_assets_value numeric(14, 2),
  add column luxury_assets_value numeric(14, 2),
  add column bank_asset_value numeric(14, 2);

create index applications_cibil_idx on public.applications(cibil_score);
create index applications_income_idx on public.applications(income_annum);