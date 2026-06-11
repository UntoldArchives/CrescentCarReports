-- ════════════════════════════════════════════════════════════════════════
-- Crescent Car Check Report Brief — schema updates
--
--   • Add engine_size to the vehicle summary fields.
--   • Allow the new buyer_recommendation value 'buy' (brief: Buy / Negotiate /
--     Avoid). 'proceed' is kept so legacy reports still satisfy the constraint;
--     new reports store 'buy' and the app normalises 'proceed' → 'buy' on read.
--
-- The status model change (Pass / Minor / Major) lives entirely in the
-- `checklist` JSON, so no column changes are needed for it — legacy
-- 'attention'/'fail' values are normalised in application code.
-- ════════════════════════════════════════════════════════════════════════

alter table public.inspection_reports
  add column if not exists engine_size text;

alter table public.inspection_reports
  drop constraint if exists inspection_reports_buyer_recommendation_check;

alter table public.inspection_reports
  add constraint inspection_reports_buyer_recommendation_check
  check (buyer_recommendation in ('proceed', 'buy', 'negotiate', 'avoid'));
