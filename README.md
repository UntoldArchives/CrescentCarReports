# Crescent Car Reports

Inspection report software for **Crescent Car Check**. A separate, invite-only
internal app where inspectors log in, build package-driven inspection reports,
save drafts, and export a clean branded customer PDF via the browser print
dialog.

> Product: **Crescent Car Reports** · by **Crescent Car Check**

## Stack

- Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS
- Supabase Auth (cookie sessions via `@supabase/ssr`) · Postgres (RLS) · Storage
- lucide-react icons · date-fns

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

Then set up the database — see [`supabase/README.md`](./supabase/README.md):
run the two migrations and seed the first admin (no public signup).

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Email + password sign-in |
| `/invite/[token]` | Invite-only account setup |
| `/forgot-password`, `/auth/reset` | Password reset |
| `/dashboard` | Stats + recent reports (first screen after login) |
| `/reports` | Search / filter / sort all reports |
| `/reports/new` | Package selection → creates a draft |
| `/reports/[id]/edit` | The inspector tool (mobile-first) |
| `/reports/[id]/preview` | Customer-facing A4 document → Print / Save PDF |
| `/settings` | Profile; admins create invites |

## How it works

- **Auth** is invite-only and cookie-based. The middleware protects every app
  route server-side, refreshes the session, enforces a **14-day inactivity**
  logout, and bumps `last_activity_at`.
- **Packages drive everything.** `lib/report-templates.ts` defines Standard /
  Comprehensive / Premium as ordered subsets of a master section library. Higher
  tiers add real sections + items and unlock report capabilities
  (recommendation, detailed photos, underbody, test drive, transmission,
  endoscopic, negotiation + summary-call notes).
- **Editing** autosaves (debounced) through a Server Action; counts and
  auto-detected critical findings (Major + Fail) are recomputed server-side so
  they can't drift. "Mark Completed" is validated both client- and server-side.
- **Photos** upload straight to Supabase Storage from the browser (camera
  capture on phones) and are referenced in the report JSON + `report_photos`.
- **PDF** is the browser print dialog for v1. The preview is a data-driven,
  A4-paged document (`components/report-document/*`) with `@media print` rules,
  ready to be reused for server-side PDF or a public sample report later.

## Security

- RLS on every table: inspectors see only their own reports/photos, admins see
  all (`public.is_admin()`).
- The service-role key is server-only (invite create/redeem, profile bootstrap).
- `public_id` is unguessable, reserved for future public report links.

## Environment

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional:
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ENABLE_GUEST_MODE` (default false).
