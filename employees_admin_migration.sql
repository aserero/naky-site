-- ============================================================
-- NAKY - Employees admin fields and policies
-- A executer dans Supabase > SQL Editor
-- ============================================================

alter table public.employees
add column if not exists address text;

alter table public.employees
add column if not exists hourly_rate numeric;

alter table public.employees
add column if not exists documents jsonb not null default '[]'::jsonb;

alter table public.employees
add column if not exists photo_url text;

alter table public.employees
add column if not exists color text;

create index if not exists idx_employees_email on public.employees(email);

alter table public.employees enable row level security;

drop policy if exists "employees_read" on public.employees;
create policy "employees_read" on public.employees
  for select
  to authenticated
  using (true);

drop policy if exists "employees_admin_manage" on public.employees;
create policy "employees_admin_manage" on public.employees
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
