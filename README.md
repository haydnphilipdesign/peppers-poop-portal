# Pepper's Portal

Mobile-first family dashboard for tracking Pepper's walks, routines, reminders, and history.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (Postgres)
- Tailwind CSS 4 + custom UI primitives

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PEPPERS_PORTAL_PIN=...
# Optional, defaults to PEPPERS_PORTAL_PIN when omitted
PEPPERS_PORTAL_SESSION_SECRET=...
```

3. For a new database, apply the baseline Supabase schema scripts:

- `supabase-schema.sql`
- `supabase-activities-schema.sql`

Then follow [the Phase 4 migration procedure](docs/phase4-walk-design.md) to apply `migrations/001-explicit-walks.sql`, review/export `002-backfill-preview.sql`, run the reviewed backfill, and apply `003-verify-and-constrain.sql`. This app requires the explicit walk schema. For an existing database, start with the migration procedure and a verified backup; do not rerun the baseline scripts on an upgraded database.

Neither earns five walk points and counts toward the walk goal, with no bathroom events. Existing ambiguous groups are labeled Historical estimate. Bathroom goals/streaks continue using original outcome timestamps; the backfill preview identifies changes to calendar-scoped walk counts/points.

Production's migration and coordinated Phase 4/5 release completed October 12, 2026. See the [improvement plan](docs/dashboard-improvement-plan.md) for live backup/restore, concurrency, permission and browser evidence, plus outstanding Galaxy S24+ checks. At the end of a release compatibility window, revoke service-role execution of the three legacy walk writers as described in the migration procedure. Close/reopen installed home-screen apps and reload old tabs after cutover.

Run disposable PostgreSQL verification with `node scripts/verify-walk-migration.mjs`. It needs `@electric-sql/pglite` available outside the project; set `PGLITE_MODULE` to that package's absolute directory if it is not on Node's module path. It creates an in-memory database and never connects to Supabase. No dependency was added to the application.

4. Run locally:

```bash
npm run dev
```

## Security Model

- Reads are public via Supabase RLS `SELECT` policies.
- Writes are blocked for anon/authenticated table access.
- All writes go through server API routes requiring a PIN-backed HttpOnly cookie session.
- `/public` is live read-only and configured with `noindex,nofollow` metadata.

## Scripts

- `npm run dev` - start dev server
- `npm run lint` - run ESLint
- `npm run test` - watch tests
- `npm run test:run` - run tests with coverage
- `npm run build` - production build
