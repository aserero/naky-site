-- ============================================================
-- NAKY - Stripe fields for Supabase
-- A executer dans Supabase > SQL Editor
-- ============================================================

alter table public.clients
add column if not exists stripe_customer_id text;

alter table public.clients
add column if not exists stripe_payment_method_id text;

create index if not exists idx_clients_stripe_customer_id
  on public.clients(stripe_customer_id);

create index if not exists idx_clients_stripe_payment_method_id
  on public.clients(stripe_payment_method_id);
