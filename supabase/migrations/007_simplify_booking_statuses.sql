-- ════════════════════════════════════════════════════════════════════════
-- 007 — Simplify the booking pipeline to 4 stages
--
-- Brief follow-up (June 2026): the original 7-status pipeline was too granular
-- for a one-inspector operation. The admin now works a 4-stage pipeline:
--
--     New → Confirmed → In Progress → Completed   (+ Cancelled / Refunded)
--
-- plus the internal `pending_payment` hold (pre-payment, never shown as a
-- managed stage). The old `inspection_in_progress` and `report_in_progress`
-- collapse into a single "In Progress"; `report_in_progress` is retired.
--
-- DB values are kept stable on purpose (so confirm_booking_paid /
-- admin_create_booking need no change) — only `report_in_progress` is removed.
-- The value→label mapping lives in the apps (booking-types.ts / types/booking.ts):
--     paid_new               → "New"
--     time_confirmed         → "Confirmed"
--     inspection_in_progress → "In Progress"   (the merged stage)
--     report_sent            → "Completed"
-- ════════════════════════════════════════════════════════════════════════

-- 1. Remap any existing rows off the retired value into the merged stage.
update public.bookings
   set booking_status = 'inspection_in_progress'
 where booking_status = 'report_in_progress';

-- 2. Tighten the booking_status check constraint (drop the retired value).
alter table public.bookings drop constraint if exists bookings_booking_status_check;
alter table public.bookings add constraint bookings_booking_status_check
  check (booking_status in ('pending_payment','paid_new','time_confirmed',
                            'inspection_in_progress','report_sent','cancelled'));

-- 3. Rebuild the active-slot partial unique index without the retired value.
--    (Same guarantee as 006: one active booking per date+slot.)
drop index if exists public.bookings_active_slot_idx;
create unique index bookings_active_slot_idx
  on public.bookings (inspection_date, slot_time)
  where booking_status in ('pending_payment','paid_new','time_confirmed',
                           'inspection_in_progress','report_sent');

-- 4. Rebuild booking_slot_availability so its "occupied"/"long booked" filters
--    no longer reference report_in_progress. Body is otherwise identical to 006.
create or replace function public.booking_slot_availability(p_date date, p_distance text default 'normal')
returns table (slot_time text, available boolean, reason text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_slots     text[] := array['09:30','11:45','14:00','16:15','18:30'];
  v_slot      text;
  v_now_dubai timestamp := (now() at time zone 'Asia/Dubai');
  v_occupied  text[];
  v_blocked   text[];
  v_long_booked boolean;
  v_available boolean;
  v_reason    text;
begin
  if p_distance not in ('normal','long') then
    raise exception 'INVALID_DISTANCE_CLASS';
  end if;

  perform public.expire_stale_holds();

  select coalesce(array_agg(b.slot_time), '{}'::text[]) into v_occupied
    from public.bookings b
   where b.inspection_date = p_date
     and b.booking_status in ('pending_payment','paid_new','time_confirmed',
                              'inspection_in_progress','report_sent');

  select coalesce(array_agg(sb.slot_time), '{}'::text[]) into v_blocked
    from public.slot_blocks sb
   where sb.block_date = p_date;

  select exists (
    select 1 from public.bookings b
     where b.inspection_date = p_date
       and b.distance_class = 'long'
       and b.booking_status in ('pending_payment','paid_new','time_confirmed',
                                'inspection_in_progress','report_sent')
  ) into v_long_booked;

  foreach v_slot in array v_slots loop
    v_available := true;
    v_reason    := null;

    if v_slot = any(v_occupied) then
      v_available := false; v_reason := 'booked';
    elsif v_slot = any(v_blocked) then
      v_available := false; v_reason := 'blocked';
    elsif v_long_booked and v_slot = '11:45' then
      -- A long-distance booking at 09:30 also blocks 11:45 (travel back).
      v_available := false; v_reason := 'travel_buffer';
    end if;

    -- Long-distance customers: 09:30 only, and the 11:45 buffer must be free.
    if v_available and p_distance = 'long' then
      if v_slot <> '09:30' then
        v_available := false; v_reason := 'long_distance_first_slot_only';
      elsif '11:45' = any(v_occupied) or '11:45' = any(v_blocked) then
        v_available := false; v_reason := 'travel_buffer_unavailable';
      end if;
    end if;

    -- Minimum notice: the slot must start more than 1 hour from now (Dubai).
    if v_available and (p_date + v_slot::time) <= v_now_dubai + interval '1 hour' then
      v_available := false; v_reason := 'cutoff';
    end if;

    return query select v_slot, v_available, v_reason;
  end loop;
end;
$$;

-- Re-apply the 006 grants/revokes for the recreated function (CREATE OR REPLACE
-- preserves them, but be explicit so a fresh apply is self-contained).
revoke all on function public.booking_slot_availability(date, text) from public, anon;
grant execute on function public.booking_slot_availability(date, text) to service_role, authenticated;
