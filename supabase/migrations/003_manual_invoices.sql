-- Factures manuelles créées depuis le back-office (B2C et B2B)
-- - type 'b2b' pour les factures entreprises
-- - coordonnées du destinataire portées par la facture (les entreprises n'ont pas de fiche client)
-- - lignes de facturation (jsonb) + taux de TVA pour la génération PDF

alter table public.invoices drop constraint invoices_type_check;
alter table public.invoices add constraint invoices_type_check
  check (type in ('employee', 'client', 'b2b'));

alter table public.invoices
  add column if not exists recipient_name text,
  add column if not exists recipient_address text,
  add column if not exists recipient_email text,
  add column if not exists recipient_siret text,
  add column if not exists lines jsonb,
  add column if not exists vat_rate numeric(4,2),
  add column if not exists notes text;
