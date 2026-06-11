-- ════════════════════════════════════════════════════════════════════════
-- 008 — Lock report deletion to admins
--
-- Access model (brief follow-up): inspectors create and edit their OWN reports
-- but may never delete a report or a booking. Booking deletion was already
-- admin-only (006, bookings_delete_admin). This migration removes the
-- inspector's ability to delete their own inspection_reports rows.
--
-- Report photos (report_photos) stay deletable by the owning inspector — that
-- is normal editing of a draft, not deleting a finished report.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists "reports_delete_own_or_admin" on public.inspection_reports;

create policy "reports_delete_admin"
  on public.inspection_reports for delete
  using ((select public.is_admin()));
