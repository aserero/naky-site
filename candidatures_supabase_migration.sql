-- ============================================================
-- NAKY - Candidatures + uploads Supabase
-- A executer dans Supabase > SQL Editor
-- ============================================================

create table if not exists public.candidatures (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  civilite text check (civilite in ('M', 'Mme')),
  first_name text,
  last_name text,
  phone text,
  address text,
  zipcode text,
  city text,
  permis_sejour text check (permis_sejour in ('francaise', 'europeenne', 'titre_residence', 'visa', 'aucun')),
  heures_semaine text check (heures_semaine in ('5-15', '15-30', '31-35')),
  annees_experience text check (annees_experience in ('aucune', 'moins_2ans', 'plus_2ans', 'plus_5ans')),
  lieux_experience text[] default '{}',
  vehicule text check (vehicule in ('voiture', 'scooter', 'velo', 'non')),
  cv_url text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidatures enable row level security;

drop policy if exists "public_insert_candidatures" on public.candidatures;
create policy "public_insert_candidatures" on public.candidatures
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins_manage_candidatures" on public.candidatures;
create policy "admins_manage_candidatures" on public.candidatures
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = auth.uid()
      and clients.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = auth.uid()
      and clients.role = 'admin'
    )
  );

create index if not exists idx_candidatures_email on public.candidatures(email);
create index if not exists idx_candidatures_status on public.candidatures(status);
create index if not exists idx_candidatures_created_at on public.candidatures(created_at desc);

create or replace function public.update_candidatures_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists candidatures_updated_at on public.candidatures;
create trigger candidatures_updated_at
before update on public.candidatures
for each row execute function public.update_candidatures_updated_at();

insert into storage.buckets (id, name, public)
values ('partner-files', 'partner-files', true)
on conflict (id) do nothing;

drop policy if exists "public_upload_partner_files" on storage.objects;
create policy "public_upload_partner_files" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'partner-files');

drop policy if exists "public_read_partner_files" on storage.objects;
create policy "public_read_partner_files" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'partner-files');

drop policy if exists "admins_manage_partner_files" on storage.objects;
create policy "admins_manage_partner_files" on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'partner-files'
    and exists (
      select 1
      from public.clients
      where clients.id = auth.uid()
      and clients.role = 'admin'
    )
  )
  with check (
    bucket_id = 'partner-files'
    and exists (
      select 1
      from public.clients
      where clients.id = auth.uid()
      and clients.role = 'admin'
    )
  );
