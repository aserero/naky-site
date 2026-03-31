-- ============================================================
-- NAKY - Reservations admin policies
-- A executer dans Supabase > SQL Editor
-- ============================================================

alter table public.reservations enable row level security;

drop policy if exists "reservations_own" on public.reservations;
create policy "reservations_own" on public.reservations
  for select
  to authenticated
  using (auth.uid() = client_id);

drop policy if exists "reservations_insert" on public.reservations;
create policy "reservations_insert" on public.reservations
  for insert
  to authenticated
  with check (auth.uid() = client_id);

drop policy if exists "reservations_admin_manage" on public.reservations;
create policy "reservations_admin_manage" on public.reservations
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
