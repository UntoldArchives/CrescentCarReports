-- ════════════════════════════════════════════════════════════════════════
-- Delete a report and re-sequence references so they stay gapless.
--
-- After deleting CCR-2026-0002 from {0001, 0002, 0003, 0004} the remaining
-- reports become {0001, 0002, 0003} (old 0003→0002, 0004→0003) and the year
-- counter is reset so the next new report continues from the end.
--
-- Renumbering is done in two phases because `report_reference` is UNIQUE and
-- the constraint is checked per-row: parking every row for the year at a
-- guaranteed-unique temporary value first avoids a transient collision while
-- the final sequential values are assigned.
--
-- SECURITY DEFINER + an explicit access check so it respects the same
-- ownership rules as the RLS delete policy (own report, or admin).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.delete_report_renumber(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int;
begin
  if not public.can_access_report(p_report_id) then
    raise exception 'Not authorised to delete this report';
  end if;

  -- Capture the report's year (from its reference) before it's removed.
  select (substring(report_reference from 'CCR-([0-9]+)-'))::int
    into v_year
  from public.inspection_reports
  where id = p_report_id;

  delete from public.inspection_reports where id = p_report_id;

  if v_year is null then
    return;
  end if;

  -- Capture the new numbering BEFORE parking, preserving the existing
  -- reference order (so 0003→0002, 0004→0003 after 0002 is removed). The
  -- padded references sort lexicographically in numeric order.
  create temp table _renum on commit drop as
    select id, row_number() over (order by report_reference) as rn
    from public.inspection_reports
    where report_reference like 'CCR-' || v_year || '-%';

  -- Phase 1 — park this year's references at unique temporary values so the
  -- UNIQUE constraint can't trip while we re-sequence.
  update public.inspection_reports
  set report_reference = 'TMP-' || id::text
  where report_reference like 'CCR-' || v_year || '-%';

  -- Phase 2 — assign gapless CCR-YYYY-000N in the captured order.
  update public.inspection_reports r
  set report_reference = 'CCR-' || v_year || '-' || lpad(t.rn::text, 4, '0')
  from _renum t
  where r.id = t.id;

  -- Keep the per-year counter in step so the next reference continues cleanly.
  insert into public.report_counters (year, last_seq)
  values (
    v_year,
    (select count(*) from public.inspection_reports
     where report_reference like 'CCR-' || v_year || '-%')
  )
  on conflict (year) do update set last_seq = excluded.last_seq;
end;
$$;
