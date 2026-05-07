-- Phase 3 guardrails: webhook idempotency + query audit logging

create table if not exists public.whatsapp_message_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone text not null,
  fingerprint text not null,
  raw_text text,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_message_events_phone_fingerprint_uidx
  on public.whatsapp_message_events(phone, fingerprint);

create index if not exists whatsapp_message_events_user_created_idx
  on public.whatsapp_message_events(user_id, created_at desc);

create table if not exists public.query_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone text,
  question text not null,
  intent text,
  result_type text,
  checks jsonb not null default '[]'::jsonb,
  is_consistent boolean not null default true,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists query_audit_logs_user_created_idx
  on public.query_audit_logs(user_id, created_at desc);

create index if not exists query_audit_logs_consistency_idx
  on public.query_audit_logs(is_consistent, created_at desc);
