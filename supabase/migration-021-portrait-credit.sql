-- Migration 021 — give the second (in-body) photo a credit, like the other photos.
-- Additive + idempotent. Run in BOTH client projects (Tollesbury + LGBT History).

alter table public.locations
  add column if not exists portrait_credit text,
  add column if not exists portrait_credit_url text;

notify pgrst, 'reload schema';
