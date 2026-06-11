-- ════════════════════════════════════════════════════════════════════════
-- Crescent Car Reports — RLS performance: initplan-wrap auth functions
--
-- Postgres re-evaluates `auth.uid()` / `public.is_admin()` ONCE PER ROW when a
-- policy references them directly. Wrapping each call in a scalar subquery —
-- `(select auth.uid())`, `(select public.is_admin())` — turns it into a single
-- InitPlan that the planner evaluates ONCE PER QUERY instead. This is the exact
-- "auth_rls_initplan" item Supabase's performance advisor flags.
--
-- Behaviour is identical — same predicate, same rows. The win shows up on the
-- multi-row read path (the reports list, up to 200 rows) and scales with data.
-- report_photos policies are intentionally left as-is: that table is only ever
-- touched one row at a time (insert/delete), so per-row eval costs nothing, and
-- its policy goes through the SECURITY DEFINER `can_access_report()` helper
-- which we don't want to inline.
--
-- Idempotent: drop + recreate each policy. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ─── inspector_profiles ─────────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin" on public.inspector_profiles;
create policy "profiles_select_own_or_admin"
  on public.inspector_profiles for select
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_update_own_or_admin" on public.inspector_profiles;
create policy "profiles_update_own_or_admin"
  on public.inspector_profiles for update
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ─── inspector_invites ──────────────────────────────────────────────────
drop policy if exists "invites_admin_select" on public.inspector_invites;
create policy "invites_admin_select"
  on public.inspector_invites for select
  using ((select public.is_admin()));

-- ─── inspection_reports (the hot, multi-row read path) ──────────────────
drop policy if exists "reports_select_own_or_admin" on public.inspection_reports;
create policy "reports_select_own_or_admin"
  on public.inspection_reports for select
  using (inspector_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "reports_insert_own" on public.inspection_reports;
create policy "reports_insert_own"
  on public.inspection_reports for insert
  with check (inspector_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "reports_update_own_or_admin" on public.inspection_reports;
create policy "reports_update_own_or_admin"
  on public.inspection_reports for update
  using (inspector_id = (select auth.uid()) or (select public.is_admin()))
  with check (inspector_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "reports_delete_own_or_admin" on public.inspection_reports;
create policy "reports_delete_own_or_admin"
  on public.inspection_reports for delete
  using (inspector_id = (select auth.uid()) or (select public.is_admin()));
