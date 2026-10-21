## Supabase: new tables (required from 30 Oct 2026)

From 30 Oct 2026, new tables in the `public` schema are no longer exposed to the Data API
(supabase-js, PostgREST, GraphQL) automatically. A table without explicit grants fails with
"permission denied" (42501). Existing tables are not affected.

This app's requests arrive as: **`authenticated`**. Users sign in with Google through Supabase
Auth (`supabase.auth.signInWithOAuth` in `personal-finance-app/src/data/AuthGate.tsx`), so
supabase-js sends the user's session token and requests run as `authenticated`. Only the
sign-in screen, before a session exists, runs as `anon`, and it reads no tables. The existing
RLS policies are `to authenticated`, and `public.is_owner()` is granted to `authenticated` only.

The database setup lives in `personal-finance-app/supabase/schema.sql` (run by hand in the
Supabase SQL Editor; there is no migrations folder). "Migration" below means that file, or
whatever SQL creates the table.

- Every new table in the public schema must include, in the SAME migration that creates it:
  1. Explicit GRANT statements for the roles that need access. For this app that is normally
     `authenticated` only, with just the privileges the app uses (e.g. `grant select, insert,
     update, delete on public.<table> to authenticated;`, or `select` only if the table is
     read-only). Do not grant to `anon`. Grant to `service_role` only if server-side code with
     the secret key needs the table (the app has none today).
  2. `alter table ... enable row level security;` plus RLS policies that match how the app uses
     the table. Follow the existing pattern: `user_id uuid not null default auth.uid()`, a
     policy `to authenticated` with `user_id = (select auth.uid()) and (select public.is_owner())`
     in both `using` and `with check`, or add the table to the RLS loop in `schema.sql`.
  3. If the table uses a sequence (serial/identity column), also grant usage, select on that
     sequence to the same role. (Existing tables use `uuid default gen_random_uuid()`, which
     needs no sequence.)
- Never run `alter default privileges` to auto-expose new tables. Access must be granted per
  table, on purpose.
- Before finishing any task that adds a table, confirm the grants and RLS policies are in the
  migration.
