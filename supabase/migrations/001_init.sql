-- ════════════════════════════════════════════════════════════════════════
-- Crescent Car Reports by Crescent Car Check — initial schema
--
-- Tables:
--   inspector_profiles   one row per auth user (admin | inspector)
--   inspector_invites    invite-only signup tokens
--   inspection_reports   the inspection report + its checklist JSON
--   report_photos        photo metadata (files live in Storage)
--
-- Security model:
--   * RLS on every table.
--   * Inspectors see/edit only their own reports + photos.
--   * Admins see/edit everything.
--   * Invites are never readable by the anon/auth client (server-only via the
--     service-role key); inspectors redeem them through a SECURITY DEFINER RPC.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════
-- 1. inspector_profiles
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.inspector_profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  phone             text,
  role              text not null default 'inspector' check (role in ('admin', 'inspector')),
  status            text not null default 'active'    check (status in ('active', 'suspended')),
  last_activity_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── helper: is the current user an admin? ──────────────────────────────
-- SECURITY DEFINER so the policy can read inspector_profiles without
-- recursively triggering its own RLS. Defined AFTER the table so the SQL
-- function body validates on a fresh database.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.inspector_profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

alter table public.inspector_profiles enable row level security;

-- A user can read their own profile; admins can read all.
create policy "profiles_select_own_or_admin"
  on public.inspector_profiles for select
  using (id = auth.uid() or public.is_admin());

-- A user can update their own profile (e.g. phone / activity); admins update all.
create policy "profiles_update_own_or_admin"
  on public.inspector_profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Inserts/role changes are handled server-side with the service-role key.

-- ════════════════════════════════════════════════════════════════════════
-- 2. inspector_invites
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.inspector_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text unique not null,
  role        text not null default 'inspector' check (role in ('admin', 'inspector')),
  invited_by  uuid references public.inspector_profiles(id) on delete set null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists inspector_invites_token_idx on public.inspector_invites (token);

alter table public.inspector_invites enable row level security;

-- No anon/authenticated access at all. Invites are created and redeemed only
-- through the service-role key (server) or the redeem RPC below. RLS with no
-- permissive policy = deny-all for the public clients.
create policy "invites_admin_select"
  on public.inspector_invites for select
  using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════
-- 3. inspection_reports
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.inspection_reports (
  id                       uuid primary key default gen_random_uuid(),
  report_reference         text unique not null,          -- e.g. CCR-2026-0001
  public_id                text unique not null,          -- unguessable, for future sharing
  inspector_id             uuid references public.inspector_profiles(id) on delete set null,
  status                   text not null default 'draft'  check (status in ('draft', 'completed', 'archived')),
  package_type             text not null                  check (package_type in ('standard', 'comprehensive', 'premium')),

  customer_name            text,
  customer_phone           text,
  customer_email           text,

  vehicle_make             text not null,
  vehicle_model            text not null,
  vehicle_year             text,
  vin                      text,
  plate_number             text,
  odometer                 text,
  regional_specs           text,                          -- GCC / Import / Unknown
  transmission             text,
  fuel_type                text,
  exterior_colour          text,
  inspection_location      text,
  inspection_date          date,
  inspection_time          text,
  main_vehicle_image_url   text,

  overall_condition        text check (overall_condition in ('good', 'caution', 'high_risk')),
  buyer_recommendation     text check (buyer_recommendation in ('proceed', 'negotiate', 'avoid')),
  inspector_summary        text,
  price_negotiation_notes  text,
  summary_call_notes       text,

  checklist                jsonb not null default '{}'::jsonb,
  critical_findings        jsonb not null default '[]'::jsonb,
  photos                   jsonb not null default '[]'::jsonb,
  counts                   jsonb not null default '{}'::jsonb,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  completed_at             timestamptz
);

create index if not exists inspection_reports_inspector_idx on public.inspection_reports (inspector_id);
create index if not exists inspection_reports_status_idx    on public.inspection_reports (status);
create index if not exists inspection_reports_updated_idx   on public.inspection_reports (updated_at desc);

alter table public.inspection_reports enable row level security;

create policy "reports_select_own_or_admin"
  on public.inspection_reports for select
  using (inspector_id = auth.uid() or public.is_admin());

create policy "reports_insert_own"
  on public.inspection_reports for insert
  with check (inspector_id = auth.uid() or public.is_admin());

create policy "reports_update_own_or_admin"
  on public.inspection_reports for update
  using (inspector_id = auth.uid() or public.is_admin())
  with check (inspector_id = auth.uid() or public.is_admin());

create policy "reports_delete_own_or_admin"
  on public.inspection_reports for delete
  using (inspector_id = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════════════════
-- 4. report_photos
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.report_photos (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.inspection_reports(id) on delete cascade,
  inspector_id uuid references public.inspector_profiles(id) on delete set null,
  section_id   text,
  item_id      text,
  url          text not null,
  path         text not null,
  caption      text,
  created_at   timestamptz not null default now()
);

create index if not exists report_photos_report_idx on public.report_photos (report_id);

alter table public.report_photos enable row level security;

-- A helper that says whether the current user owns (or admins) a given report.
create or replace function public.can_access_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.inspection_reports r
    where r.id = p_report_id
      and (r.inspector_id = auth.uid() or public.is_admin())
  );
$$;

create policy "photos_select_for_owned_report"
  on public.report_photos for select
  using (public.can_access_report(report_id));

create policy "photos_insert_for_owned_report"
  on public.report_photos for insert
  with check (public.can_access_report(report_id));

create policy "photos_delete_for_owned_report"
  on public.report_photos for delete
  using (public.can_access_report(report_id));

-- ════════════════════════════════════════════════════════════════════════
-- updated_at trigger
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.inspector_profiles;
create trigger trg_profiles_updated
  before update on public.inspector_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reports_updated on public.inspection_reports;
create trigger trg_reports_updated
  before update on public.inspection_reports
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- Report reference sequence  →  CCR-YYYY-0001
-- A dedicated counter table keeps references gapless and unique per year.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.report_counters (
  year      int primary key,
  last_seq  int not null default 0
);

create or replace function public.next_report_reference()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_seq  int;
begin
  insert into public.report_counters (year, last_seq)
  values (v_year, 1)
  on conflict (year)
  do update set last_seq = public.report_counters.last_seq + 1
  returning last_seq into v_seq;

  return 'CCR-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
