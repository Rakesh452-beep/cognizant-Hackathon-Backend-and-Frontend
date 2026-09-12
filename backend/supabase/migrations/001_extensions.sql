create extension if not exists "pgcrypto";

create type public.app_role as enum ('applicant', 'reviewer', 'admin');

create type public.application_status as enum (
  'PENDING',
  'PROCESSING',
  'PROCESSED',
  'NEEDS_MORE_INFO',
  'APPROVED',
  'REJECTED'
);

create type public.document_type as enum (
  'PAYSLIP',
  'BANK_STATEMENT',
  'TAX_RETURN',
  'KYC',
  'OTHER'
);

create type public.document_status as enum (
  'UPLOADED',
  'VALID',
  'INVALID',
  'MISSING'
);

create type public.notification_type as enum (
  'APPLICATION_SUBMITTED',
  'PROCESSING_STARTED',
  'SUMMARY_READY',
  'MISSING_DOCUMENTS',
  'REVIEW_DECISION',
  'SYSTEM'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;