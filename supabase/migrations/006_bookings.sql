-- ════════════════════════════════════════════════════════════════════════
-- 006 — Booking system (client brief, June 2026)
--
-- Consolidates public-website bookings into THIS project so bookings,
-- inspector_profiles and inspection_reports live in one database with real
-- foreign keys. The public website (Crescent Car Checks) points its
-- service-role client at this project and talks to these tables only through
-- the SECURITY DEFINER RPCs below; the admin app uses RLS + admin RPCs.
--
-- Slot model (V1, one inspector based in Ajman):
--   * 5 fixed slots/day: 09:30, 11:45, 14:00, 16:15, 18:30 (Asia/Dubai).
--   * Normal-distance (Ajman/Sharjah/Dubai/UAQ): any free slot, blocks 1 slot,
--     bookable until 1 hour before the slot starts.
--   * Long-distance (Abu Dhabi/RAK/Fujairah/Al Ain): 09:30 only, and the
--     booking also blocks 11:45 (travel buffer). Requires BOTH free.
--   * Public payment hold: 30 minutes (matches Stripe Checkout's minimum
--     session expiry; the client brief said 20 — aligned up to avoid a
--     pay-after-release race).
--   * Admin can manually block/unblock slots and add bookings that bypass the
--     distance rules (urgent long-distance), but never double-book a slot.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════
-- 1. bookings
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.bookings (
  -- Customer-facing reference (e.g. CCB-7F3K2Q). Random, not sequential, so it
  -- is safe to show in URLs/Stripe metadata without leaking booking volume.
  id                       text primary key,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  customer_name            text not null,
  customer_phone           text not null,
  customer_email           text,

  emirate                  text not null check (emirate in
    ('Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah','Al Ain')),
  -- Stored at booking time so rule changes never reinterpret old rows.
  distance_class           text not null check (distance_class in ('normal','long')),
  address                  text not null,
  location_lat             double precision,
  location_lng             double precision,
  parking_type             text check (parking_type in ('showroom','outdoor','home')),
  additional_notes         text,

  car_make                 text not null,
  car_model                text not null,
  car_year                 text not null,
  vin                      text,
  plate_number             text,

  inspection_date          date not null,
  slot_time                text not null check (slot_time in ('09:30','11:45','14:00','16:15','18:30')),

  package_id               text not null check (package_id in ('standard','comprehensive','premium')),
  package_name             text not null,
  package_price            integer not null,
  travel_fee               integer not null default 0,   -- flat AED 100 for long-distance
  total_price              integer not null,             -- what Stripe charges

  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  -- 'manual' = added by admin, paid outside Stripe (cash/transfer/WhatsApp).
  payment_status           text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded','manual')),
  -- Brief §9 pipeline. 'pending_payment' is the pre-payment hold;
  -- 'cancelled' covers both Cancelled and Refunded (payment_status says which).
  booking_status           text not null default 'pending_payment'
    check (booking_status in ('pending_payment','paid_new','time_confirmed',
                              'inspection_in_progress','report_in_progress','report_sent','cancelled')),

  hold_expires_at          timestamptz,
  paid_at                  timestamptz,
  cancelled_at             timestamptz,

  -- Admin-side fields (brief §8/§10). V1 default inspector is assigned on
  -- payment confirmation (see confirm_booking_paid).
  assigned_inspector       uuid references public.inspector_profiles(id) on delete set null,
  report_id                uuid references public.inspection_reports(id) on delete set null,
  admin_notes              text,
  manual_booking           boolean not null default false,
  created_by               uuid references public.inspector_profiles(id) on delete set null,

  -- Kept from the old website schema (tentative calendar hold after payment).
  google_calendar_event_id text
);

create index if not exists bookings_date_idx           on public.bookings (inspection_date);
create index if not exists bookings_status_idx         on public.bookings (booking_status);
create index if not exists bookings_created_idx        on public.bookings (created_at desc);
create index if not exists bookings_inspector_idx      on public.bookings (assigned_inspector);
create index if not exists bookings_report_idx         on public.bookings (report_id);
create index if not exists bookings_hold_expires_idx   on public.bookings (hold_expires_at) where hold_expires_at is not null;
create index if not exists bookings_stripe_session_idx on public.bookings (stripe_session_id) where stripe_session_id is not null;

-- Database-level guarantee: ONE active booking per date+slot. Active = a live
-- payment hold or any paid/confirmed state. Stale pending_payment holds are
-- swept to cancelled by expire_stale_holds() (called by every RPC below)
-- before inserts, so they leave this index and free the slot. A concurrent
-- duplicate insert fails with 23505, which the RPCs surface as SLOT_UNAVAILABLE.
create unique index if not exists bookings_active_slot_idx
  on public.bookings (inspection_date, slot_time)
  where booking_status in ('pending_payment','paid_new','time_confirmed',
                           'inspection_in_progress','report_in_progress','report_sent');

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated
  before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

-- Admins manage everything; inspectors can read bookings assigned to them.
-- The public website uses the service-role key (bypasses RLS) via RPCs only.
-- auth calls wrapped in scalar subqueries per the 005 InitPlan optimisation.
create policy "bookings_select_admin_or_assigned"
  on public.bookings for select
  using ((select public.is_admin()) or assigned_inspector = (select auth.uid()));

create policy "bookings_update_admin"
  on public.bookings for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "bookings_delete_admin"
  on public.bookings for delete
  using ((select public.is_admin()));

-- No insert policy: inserts happen only through the SECURITY DEFINER RPCs
-- below or the service-role key.

-- ════════════════════════════════════════════════════════════════════════
-- 2. slot_blocks — manual admin blocks (brief §10)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.slot_blocks (
  id          uuid primary key default gen_random_uuid(),
  block_date  date not null,
  slot_time   text not null check (slot_time in ('09:30','11:45','14:00','16:15','18:30')),
  reason      text,
  created_by  uuid references public.inspector_profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (block_date, slot_time)
);

create index if not exists slot_blocks_date_idx on public.slot_blocks (block_date);

alter table public.slot_blocks enable row level security;

create policy "slot_blocks_select_authenticated"
  on public.slot_blocks for select
  using ((select auth.uid()) is not null);

create policy "slot_blocks_insert_admin"
  on public.slot_blocks for insert
  with check ((select public.is_admin()));

create policy "slot_blocks_delete_admin"
  on public.slot_blocks for delete
  using ((select public.is_admin()));

-- ════════════════════════════════════════════════════════════════════════
-- 3. contact_messages — moved with the website env swap (admin can now read
--    them in the dashboard; the website inserts via service role)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  topic       text,
  car_make    text,
  car_model   text,
  car_year    text,
  message     text not null
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

create policy "contact_messages_select_admin"
  on public.contact_messages for select
  using ((select public.is_admin()));

-- ════════════════════════════════════════════════════════════════════════
-- 4. Booking reference — CCB- + 6 random base32-ish chars, unguessable
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.next_booking_reference()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ref text;
begin
  loop
    -- 6 hex chars from a core gen_random_uuid() (pg_catalog) — avoids pgcrypto's
    -- gen_random_bytes, which on Supabase lives in the `extensions` schema and is
    -- not on this function's search_path. Collisions just re-roll.
    v_ref := 'CCB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.bookings where id = v_ref);
  end loop;
  return v_ref;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 5. Hold expiry sweep — flips stale 30-minute holds to cancelled so they
--    leave the active-slot index. Called by every availability/insert RPC.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.expire_stale_holds()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.bookings
     set booking_status = 'cancelled',
         payment_status = 'failed',
         cancelled_at   = now()
   where booking_status  = 'pending_payment'
     and payment_status  = 'pending'
     and hold_expires_at < now();
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 6. Availability — the single source of truth for the slot rules.
--    p_distance: 'normal' | 'long' (the requesting customer's emirate class).
--    Reasons: booked | blocked | travel_buffer | long_distance_first_slot_only
--             | travel_buffer_unavailable | cutoff
-- ════════════════════════════════════════════════════════════════════════
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
                              'inspection_in_progress','report_in_progress','report_sent');

  select coalesce(array_agg(sb.slot_time), '{}'::text[]) into v_blocked
    from public.slot_blocks sb
   where sb.block_date = p_date;

  select exists (
    select 1 from public.bookings b
     where b.inspection_date = p_date
       and b.distance_class = 'long'
       and b.booking_status in ('pending_payment','paid_new','time_confirmed',
                                'inspection_in_progress','report_in_progress','report_sent')
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

-- ════════════════════════════════════════════════════════════════════════
-- 7. Public booking hold — validates ALL rules, inserts a 30-minute hold.
--    Raises 'SLOT_UNAVAILABLE' when the slot can't be booked.
--    Serialised per-date with an advisory lock so two concurrent customers
--    can't pass validation together (e.g. long@09:30 vs normal@11:45).
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.create_booking_hold(
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text,
  p_emirate          text,
  p_address          text,
  p_location_lat     double precision,
  p_location_lng     double precision,
  p_parking_type     text,
  p_additional_notes text,
  p_car_make         text,
  p_car_model        text,
  p_car_year         text,
  p_vin              text,
  p_plate_number     text,
  p_inspection_date  date,
  p_slot_time        text,
  p_package_id       text,
  p_package_name     text,
  p_package_price    integer,
  p_travel_fee       integer,
  p_total_price      integer
)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_distance text;
  v_ok       boolean;
  v_row      public.bookings;
begin
  v_distance := case
    when p_emirate in ('Abu Dhabi','Ras Al Khaimah','Fujairah','Al Ain') then 'long'
    else 'normal'
  end;

  perform pg_advisory_xact_lock(hashtext('crescent_booking_' || p_inspection_date::text));

  select a.available into v_ok
    from public.booking_slot_availability(p_inspection_date, v_distance) a
   where a.slot_time = p_slot_time;

  if v_ok is distinct from true then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  insert into public.bookings (
    id, customer_name, customer_phone, customer_email,
    emirate, distance_class, address, location_lat, location_lng,
    parking_type, additional_notes,
    car_make, car_model, car_year, vin, plate_number,
    inspection_date, slot_time,
    package_id, package_name, package_price, travel_fee, total_price,
    payment_status, booking_status, hold_expires_at
  ) values (
    public.next_booking_reference(), p_customer_name, p_customer_phone, nullif(p_customer_email, ''),
    p_emirate, v_distance, p_address, p_location_lat, p_location_lng,
    nullif(p_parking_type, ''), nullif(p_additional_notes, ''),
    p_car_make, p_car_model, p_car_year, nullif(p_vin, ''), nullif(p_plate_number, ''),
    p_inspection_date, p_slot_time,
    p_package_id, p_package_name, p_package_price, p_travel_fee, p_total_price,
    'pending', 'pending_payment', now() + interval '30 minutes'
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'SLOT_UNAVAILABLE';
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 8. Payment confirmation (Stripe webhook) — idempotent: only a live hold
--    transitions, a repeated webhook gets NULL back and skips emails.
--    Also assigns the V1 default inspector (Khalid, or the only active one).
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.confirm_booking_paid(p_id text, p_payment_intent text default null)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row       public.bookings;
  v_inspector uuid;
begin
  update public.bookings
     set payment_status           = 'paid',
         booking_status           = 'paid_new',
         stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
         paid_at                  = now()
   where id = p_id
     and booking_status = 'pending_payment'
     and payment_status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    return null;
  end if;

  select ip.id into v_inspector
    from public.inspector_profiles ip
   where ip.status = 'active' and ip.full_name ilike '%khalid%'
   order by ip.created_at
   limit 1;

  if v_inspector is null then
    select case when count(*) = 1 then min(ip.id::text)::uuid end into v_inspector
      from public.inspector_profiles ip
     where ip.status = 'active';
  end if;

  if v_inspector is not null then
    update public.bookings set assigned_inspector = v_inspector where id = p_id;
    v_row.assigned_inspector := v_inspector;
  end if;

  return v_row;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 9. Cancel a pending hold (Stripe session expired / payment failed).
--    Idempotent like confirm_booking_paid.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.cancel_pending_booking(p_id text)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row public.bookings;
begin
  update public.bookings
     set payment_status = 'failed',
         booking_status = 'cancelled',
         cancelled_at   = now()
   where id = p_id
     and booking_status = 'pending_payment'
     and payment_status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    return null;
  end if;
  return v_row;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 10. Admin manual booking (brief §10) — bypasses the distance/cutoff rules
--     ("urgent long-distance ... admin can manually accept them"), but the
--     active-slot unique index still prevents double-booking.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.admin_create_booking(
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_email     text,
  p_emirate            text,
  p_address            text,
  p_car_make           text,
  p_car_model          text,
  p_car_year           text,
  p_vin                text,
  p_plate_number       text,
  p_inspection_date    date,
  p_slot_time          text,
  p_package_id         text,
  p_package_name       text,
  p_package_price      integer,
  p_travel_fee         integer,
  p_total_price        integer,
  p_payment_status     text default 'manual',
  p_booking_status     text default 'paid_new',
  p_assigned_inspector uuid default null,
  p_admin_notes        text default null,
  p_additional_notes   text default null
)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_distance text;
  v_row      public.bookings;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  v_distance := case
    when p_emirate in ('Abu Dhabi','Ras Al Khaimah','Fujairah','Al Ain') then 'long'
    else 'normal'
  end;

  perform pg_advisory_xact_lock(hashtext('crescent_booking_' || p_inspection_date::text));
  perform public.expire_stale_holds();

  insert into public.bookings (
    id, customer_name, customer_phone, customer_email,
    emirate, distance_class, address,
    car_make, car_model, car_year, vin, plate_number,
    inspection_date, slot_time,
    package_id, package_name, package_price, travel_fee, total_price,
    payment_status, booking_status,
    assigned_inspector, admin_notes, additional_notes,
    manual_booking, created_by,
    paid_at
  ) values (
    public.next_booking_reference(), p_customer_name, p_customer_phone, nullif(p_customer_email, ''),
    p_emirate, v_distance, p_address,
    p_car_make, p_car_model, p_car_year, nullif(p_vin, ''), nullif(p_plate_number, ''),
    p_inspection_date, p_slot_time,
    p_package_id, p_package_name, p_package_price, p_travel_fee, p_total_price,
    p_payment_status, p_booking_status,
    p_assigned_inspector, nullif(p_admin_notes, ''), nullif(p_additional_notes, ''),
    true, auth.uid(),
    case when p_payment_status in ('paid','manual') then now() end
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'SLOT_UNAVAILABLE';
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 11. Function grants — nothing for anon; the website server uses the
--     service role, the admin app is authenticated.
-- ════════════════════════════════════════════════════════════════════════
revoke all on function public.next_booking_reference() from public, anon;
revoke all on function public.expire_stale_holds() from public, anon;
revoke all on function public.booking_slot_availability(date, text) from public, anon;
revoke all on function public.create_booking_hold(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,date,text,text,text,integer,integer,integer) from public, anon;
revoke all on function public.confirm_booking_paid(text, text) from public, anon;
revoke all on function public.cancel_pending_booking(text) from public, anon;
revoke all on function public.admin_create_booking(text,text,text,text,text,text,text,text,text,text,date,text,text,text,integer,integer,integer,text,text,uuid,text,text) from public, anon;

grant execute on function public.expire_stale_holds() to service_role;
grant execute on function public.booking_slot_availability(date, text) to service_role, authenticated;
grant execute on function public.create_booking_hold(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,date,text,text,text,integer,integer,integer) to service_role;
grant execute on function public.confirm_booking_paid(text, text) to service_role;
grant execute on function public.cancel_pending_booking(text) to service_role;
grant execute on function public.admin_create_booking(text,text,text,text,text,text,text,text,text,text,date,text,text,text,integer,integer,integer,text,text,uuid,text,text) to authenticated, service_role;

-- Harden: Supabase's default privileges auto-grant EXECUTE to `authenticated` on
-- every function created in `public`, so `revoke ... from public, anon` above is
-- not enough. These five run only via the website's service-role client (or
-- internally as SECURITY DEFINER), so a signed-in user must not reach them through
-- /rest/v1/rpc — revoke `authenticated` explicitly. booking_slot_availability stays
-- (the admin schedule reads it) and admin_create_booking stays (it self-checks
-- is_admin() and raises FORBIDDEN otherwise).
revoke execute on function public.next_booking_reference() from authenticated;
revoke execute on function public.expire_stale_holds() from authenticated;
revoke execute on function public.create_booking_hold(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,date,text,text,text,integer,integer,integer) from authenticated;
revoke execute on function public.confirm_booking_paid(text, text) from authenticated;
revoke execute on function public.cancel_pending_booking(text) from authenticated;
