-- Traçabilité import base44 : identifiant d'origine sur les tables migrées
alter table public.clients add column if not exists legacy_id text unique;
alter table public.employees add column if not exists legacy_id text unique;
alter table public.bookings add column if not exists legacy_id text unique;
alter table public.invoices add column if not exists legacy_id text unique;
alter table public.candidatures add column if not exists legacy_id text unique;
