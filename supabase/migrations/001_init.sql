-- ============================================================
-- Naky v2 — schéma initial (Postgres / Supabase)
-- Corrige les défauts du modèle base44 :
--   - durées en minutes (int), heures en type time
--   - données bancaires isolées (client_urssaf_details)
--   - factures discriminées client/employée
--   - statuts URSSAF en deux champs distincts
--   - RLS partout, rôles via profiles
-- ============================================================

-- ---------- Rôles ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- Fonction utilisée par les policies (security definer pour éviter la récursion RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Auto-création du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Clients ----------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null, -- null si créé par l'admin sans compte
  civilite text check (civilite in ('M', 'Mme')),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  address text,
  zipcode text,
  city text,
  digicode text,
  instructions text,
  has_animals boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  -- Cycle avance immédiate (unique champ, vocabulaire unifié) :
  -- none → pending (souhaite l'AI) → [dossier rempli → urssaf_completed=true, ai_status='completed']
  --   → ai_requested (demande faite à l'URSSAF) → ai_accepted | ai_refused
  urssaf_completed boolean not null default false,
  ai_status text not null default 'none'
    check (ai_status in ('none', 'pending', 'completed', 'ai_requested', 'ai_accepted', 'ai_refused')),
  abby_id text,
  stripe_customer_id text,
  stripe_payment_method_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_id_idx on public.clients (user_id);
create index clients_email_idx on public.clients (email);

-- Données sensibles du dossier URSSAF (IBAN/BIC, état civil complet, adresse normée)
create table public.client_urssaf_details (
  client_id uuid primary key references public.clients on delete cascade,
  nom_naissance text,
  birthdate date,
  pays_naissance text default 'France',
  zipcode_naissance text,
  iban text,
  bic text,
  account_holder text,
  numero_voie text,
  lettre_voie text,
  type_voie text,
  nom_voie text,
  lieu_dit text,
  complement_adresse text,
  pays text default 'France',
  zipcode text,
  city text,
  updated_at timestamptz not null default now()
);

-- ---------- Employées ----------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_date date not null default current_date,
  hourly_rate numeric(6,2),
  color text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees on delete cascade,
  name text not null,
  type text not null check (type in ('piece_identite', 'auto_entrepreneur', 'rib', 'casier_judiciaire', 'contrat', 'autre')),
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index employee_documents_employee_idx on public.employee_documents (employee_id);

-- Vue restreinte lisible par les clients (prénom + photo de l'agent assigné).
-- security_invoker=off volontaire : la vue est le SEUL canal de lecture non-admin.
create view public.employees_public
  with (security_invoker = off) as
  select id, first_name, photo_url from public.employees where status = 'active';

grant select on public.employees_public to authenticated;

-- ---------- Réservations ----------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients on delete set null,
  employee_id uuid references public.employees on delete set null,
  address text not null,
  zipcode text not null,
  city text not null,
  additional_address text,
  service_type text not null default 'regular'
    check (service_type in ('regular', 'one_time', 'spring', 'enterprise')),
  recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'twice_weekly', 'biweekly', 'monthly')),
  date date not null,
  start_time time not null,
  duration_minutes int not null check (duration_minutes between 30 and 720),
  hourly_rate numeric(6,2) not null,
  total_price numeric(8,2) not null,
  advance_immediate boolean not null default false,
  has_animals boolean not null default false,
  has_cleaning_supplies boolean not null default false,
  instructions text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  billing_status text not null default 'none'
    check (billing_status in ('none', 'avance_immediate', 'generated', 'paid')),
  payment_method text check (payment_method in ('stripe', 'urssaf')),
  urssaf_status text not null default 'none'
    check (urssaf_status in ('none', 'pending', 'requested', 'accepted', 'refused')),
  abby_invoice_id text,
  invoice_file_path text,   -- chemin dans le bucket privé "invoices"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_client_idx on public.bookings (client_id);
create index bookings_employee_idx on public.bookings (employee_id);
create index bookings_date_idx on public.bookings (date);

-- updated_at automatique
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ---------- Factures ----------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('employee', 'client')),
  number text not null,
  employee_id uuid references public.employees on delete set null,
  client_id uuid references public.clients on delete set null,
  booking_id uuid references public.bookings on delete set null,
  amount numeric(8,2) not null,
  date date not null default current_date,
  period_start date,
  period_end date,
  status text not null default 'pending' check (status in ('draft', 'pending', 'paid')),
  file_path text,
  created_at timestamptz not null default now()
);

create index invoices_employee_idx on public.invoices (employee_id);
create index invoices_client_idx on public.invoices (client_id);

-- ---------- Candidatures ----------

create table public.candidatures (
  id uuid primary key default gen_random_uuid(),
  civilite text check (civilite in ('M', 'Mme')),
  first_name text,
  last_name text,
  email text not null,
  phone text,
  address text,
  zipcode text,
  city text,
  permis_sejour text check (permis_sejour in ('francaise', 'europeenne', 'titre_residence', 'visa', 'aucun')),
  heures_semaine text check (heures_semaine in ('5-15', '15-30', '31-35')),
  annees_experience text check (annees_experience in ('aucune', 'moins_2ans', 'plus_2ans', 'plus_5ans')),
  lieux_experience text[] not null default '{}',
  vehicule text check (vehicule in ('voiture', 'scooter', 'velo', 'non')),
  cv_path text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------- Leads ----------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'out_of_zone' check (kind in ('out_of_zone', 'enterprise')),
  email text not null,
  first_name text,
  last_name text,
  phone text,
  address text,
  zipcode text,
  city text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_urssaf_details enable row level security;
alter table public.employees enable row level security;
alter table public.employee_documents enable row level security;
alter table public.bookings enable row level security;
alter table public.invoices enable row level security;
alter table public.candidatures enable row level security;
alter table public.leads enable row level security;

-- profiles : chacun lit le sien ; admin lit tout
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- clients : le client gère sa fiche, l'admin tout
create policy "clients_select" on public.clients
  for select using (user_id = auth.uid() or public.is_admin());
create policy "clients_insert_own" on public.clients
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "clients_update" on public.clients
  for update using (user_id = auth.uid() or public.is_admin());
create policy "clients_delete_admin" on public.clients
  for delete using (public.is_admin());

-- dossier URSSAF : le client gère le sien, l'admin tout
create policy "urssaf_select" on public.client_urssaf_details
  for select using (
    public.is_admin() or
    client_id in (select id from public.clients where user_id = auth.uid())
  );
create policy "urssaf_upsert" on public.client_urssaf_details
  for insert with check (
    public.is_admin() or
    client_id in (select id from public.clients where user_id = auth.uid())
  );
create policy "urssaf_update" on public.client_urssaf_details
  for update using (
    public.is_admin() or
    client_id in (select id from public.clients where user_id = auth.uid())
  );

-- employées : admin uniquement (les clients passent par la vue employees_public)
create policy "employees_admin" on public.employees
  for all using (public.is_admin());
create policy "employee_documents_admin" on public.employee_documents
  for all using (public.is_admin());

-- bookings : le client voit/crée les siens ; l'admin tout
create policy "bookings_select" on public.bookings
  for select using (
    public.is_admin() or
    client_id in (select id from public.clients where user_id = auth.uid())
  );
create policy "bookings_insert" on public.bookings
  for insert with check (
    public.is_admin() or
    client_id in (select id from public.clients where user_id = auth.uid())
  );
create policy "bookings_update_admin" on public.bookings
  for update using (public.is_admin());
create policy "bookings_delete_admin" on public.bookings
  for delete using (public.is_admin());

-- factures : admin ; le client peut lire ses factures "client"
create policy "invoices_select" on public.invoices
  for select using (
    public.is_admin() or
    (type = 'client' and client_id in (select id from public.clients where user_id = auth.uid()))
  );
create policy "invoices_write_admin" on public.invoices
  for insert with check (public.is_admin());
create policy "invoices_update_admin" on public.invoices
  for update using (public.is_admin());
create policy "invoices_delete_admin" on public.invoices
  for delete using (public.is_admin());

-- candidatures : dépôt public (formulaire partenaire), gestion admin
create policy "candidatures_insert_public" on public.candidatures
  for insert to anon, authenticated with check (true);
create policy "candidatures_admin_select" on public.candidatures
  for select using (public.is_admin());
create policy "candidatures_admin_update" on public.candidatures
  for update using (public.is_admin());
create policy "candidatures_admin_delete" on public.candidatures
  for delete using (public.is_admin());

-- leads : dépôt public, lecture admin
create policy "leads_insert_public" on public.leads
  for insert to anon, authenticated with check (true);
create policy "leads_admin_select" on public.leads
  for select using (public.is_admin());
create policy "leads_admin_delete" on public.leads
  for delete using (public.is_admin());

-- ============================================================
-- Storage : buckets + policies
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('cvs', 'cvs', false),
  ('employee-docs', 'employee-docs', false),
  ('invoices', 'invoices', false),
  ('photos', 'photos', true)
on conflict (id) do nothing;

-- CV : dépôt public (candidature), lecture admin
create policy "cvs_insert_public" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'cvs');
create policy "cvs_read_admin" on storage.objects
  for select using (bucket_id = 'cvs' and public.is_admin());

-- Documents employées : admin uniquement
create policy "employee_docs_admin" on storage.objects
  for all using (bucket_id = 'employee-docs' and public.is_admin())
  with check (bucket_id = 'employee-docs' and public.is_admin());

-- Factures : écriture admin ; lecture admin + client propriétaire
-- (les PDF clients sont rangés sous clients/{client_id}/...)
create policy "invoices_storage_admin" on storage.objects
  for all using (bucket_id = 'invoices' and public.is_admin())
  with check (bucket_id = 'invoices' and public.is_admin());
create policy "invoices_storage_client_read" on storage.objects
  for select using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = 'clients'
    and (storage.foldername(name))[2] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

-- Photos : lecture publique (bucket public), écriture admin
create policy "photos_write_admin" on storage.objects
  for insert with check (bucket_id = 'photos' and public.is_admin());
create policy "photos_update_admin" on storage.objects
  for update using (bucket_id = 'photos' and public.is_admin());
create policy "photos_delete_admin" on storage.objects
  for delete using (bucket_id = 'photos' and public.is_admin());
