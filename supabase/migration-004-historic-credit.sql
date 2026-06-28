-- Migration 004 — separate credit for the historic (before) slider image.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists historic_credit     text;
alter table public.locations add column if not exists historic_credit_url text;
