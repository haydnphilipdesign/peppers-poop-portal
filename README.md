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

3. Apply Supabase schema scripts:

- `supabase-schema.sql`
- `supabase-activities-schema.sql`

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
