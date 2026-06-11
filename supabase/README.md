# Supabase setup — Crescent Car Reports

## 1. Run the migrations

In the Supabase dashboard → SQL Editor, run in order:

1. `migrations/001_init.sql` — tables, RLS, helpers, report-reference sequence
2. `migrations/002_storage.sql` — `report-photos` bucket + storage policies

(Or `supabase db push` if you use the CLI.)

## 2. Create the first admin

There is **no public signup** — accounts are invite-only, and the first invite
has to be sent by an admin, so you must seed one admin by hand.

1. Dashboard → Authentication → Users → **Add user** → set an email + password
   (and tick "Auto Confirm User").
2. Copy that user's UUID.
3. SQL Editor:

```sql
insert into public.inspector_profiles (id, full_name, email, role, status)
values ('<paste-uuid>', 'Admin Name', 'admin@crescentcarchecks.com', 'admin', 'active');
```

You can now log in at `/login` and create inspector invites from `/settings`.

## 3. Environment

Copy `.env.example` → `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project → API
- `SUPABASE_SERVICE_ROLE_KEY` — Project → API → service role (**server only**)

## Notes

- RLS is on for every table. Inspectors only ever see their own reports/photos;
  admins see everything (`public.is_admin()`).
- Invites are not readable by the browser client; they're created and redeemed
  server-side with the service-role key.
- Report references are issued by `public.next_report_reference()` → `CCR-2026-0001`.
