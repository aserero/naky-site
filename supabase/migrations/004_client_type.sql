-- Type de client : B2C (particulier, défaut — tous les clients existants) ou B2B (entreprise)
alter table public.clients
  add column if not exists client_type text not null default 'b2c' check (client_type in ('b2c', 'b2b')),
  add column if not exists company_name text,
  add column if not exists siret text;
