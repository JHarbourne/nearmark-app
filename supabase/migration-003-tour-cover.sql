-- Migration 003 — tour cover focal point + photo credit.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.tours add column if not exists cover_position   text default '50% 50%';
alter table public.tours add column if not exists cover_credit      text;
alter table public.tours add column if not exists cover_credit_url  text;
