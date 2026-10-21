-- Personal finance app — database setup (design.md §4).
-- Run once in Supabase → SQL Editor. Safe to re-run: it only creates what is missing.
--
-- After running it, add the Google account allowed to use the app (not stored in this repo):
--   insert into private.allowed_emails (email) values ('you@gmail.com');

-- ---------- Access: only allowed Google accounts ----------

create schema if not exists private;

create table if not exists private.allowed_emails (
  email text primary key
);
-- No grants on the private schema: browsers can never read or change this list.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- ---------- Tables ----------

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('spendable', 'savings')),
  opening_balance bigint not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
-- The app reads, adds and edits wallets (upsert = insert + update); it never deletes them.
grant select, insert, update on public.wallets to authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('expense', 'income')),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
-- Categories are hidden (active = false), never deleted.
grant select, insert, update on public.categories to authenticated;

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount bigint not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  wallet_id uuid not null references public.wallets on delete restrict,
  category_id uuid not null references public.categories on delete restrict,
  active boolean not null default true,
  start_date date not null,
  last_period text check (last_period ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);
-- Recurring items are saved by upsert (insert + update) and turned off, never deleted.
grant select, insert, update on public.recurring to authenticated;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount bigint not null check (amount > 0),
  date date not null,
  wallet_id uuid not null references public.wallets on delete restrict,
  category_id uuid references public.categories on delete restrict,
  to_wallet_id uuid references public.wallets on delete restrict,
  note text,
  recurring_id uuid references public.recurring on delete set null,
  recurring_period text check (recurring_period ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  -- Rule 1 & 3: Chi/Thu have exactly one category; Chuyển has a different receiving wallet.
  constraint transactions_shape check (
    (type = 'transfer' and to_wallet_id is not null and to_wallet_id <> wallet_id and category_id is null)
    or (type <> 'transfer' and category_id is not null and to_wallet_id is null)
  ),
  -- One generated transaction per recurring item per month, even if two devices generate at once.
  -- (NULLs are distinct, so manual transactions are unaffected.)
  constraint transactions_one_per_recurring_month unique (recurring_id, recurring_period)
);
-- The only table the app deletes from.
grant select, insert, update, delete on public.transactions to authenticated;

create index if not exists transactions_user_date on public.transactions (user_id, date);

-- ---------- Row-level security: your own rows, and only if your email is allowed ----------

do $$
declare t text;
begin
  foreach t in array array['wallets', 'categories', 'recurring', 'transactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using (user_id = (select auth.uid()) and (select public.is_owner()))
         with check (user_id = (select auth.uid()) and (select public.is_owner()))',
      t
    );
  end loop;
end $$;
