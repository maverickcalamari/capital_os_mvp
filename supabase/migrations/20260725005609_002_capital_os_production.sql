/*
# Capital OS production schema (v0.2)

## Overview
Upgrades the starter schema into a multi-user, owner-scoped financial operating
system. Every table is owner-scoped to the authenticated user via `user_id uuid
NOT NULL DEFAULT auth.uid()`, locked down with per-verb RLS policies, and indexed
for the query patterns the frontend uses. Adds the additional tables the
product requires (profiles, accounts, opportunities, reports, forecasts,
notifications, settings) and extends the existing tables with columns the
production UI needs (notes/receipts on transactions, templates/rollover on
budgets, etc.).

## Important notes
1. The four existing tables (budget_categories, transactions, goals,
   investments) are altered IN PLACE — no data is dropped. New columns are
   added with `IF NOT EXISTS` via a DO block so the migration is idempotent.
2. The original `FOR ALL` policies are dropped and replaced with four
   per-verb (SELECT/INSERT/UPDATE/DELETE) policies per table, as required.
3. `user_id` columns are backfilled with `DEFAULT auth.uid()` so frontend
   inserts that omit `user_id` still satisfy the INSERT WITH CHECK policy.
4. `updated_at` is maintained by a reusable trigger function.
5. RLS is enabled on every new table.

## New tables
- `profiles`           — display name, avatar url, plan info per user.
- `accounts`           — linked financial accounts (Plaid-ready placeholder).
- `opportunities`      — scored investment/business opportunities.
- `reports`             — saved executive brief snapshots.
- `forecasts`          — saved forecast scenario snapshots.
- `notifications`      — in-app alert inbox.
- `settings`           — per-user app settings (single row per user).

## Modified tables
- `budget_categories`  — +month_key, +template_name, +rollover, +notes.
- `transactions`       — +notes, +receipt_url, +is_recurring.
- `goals`              — +notes, +priority.
- `investments`        — +notes, +institution.

## Security
- RLS enabled on every table.
- Per-verb owner-scoped policies on every table (TO authenticated,
  auth.uid() = user_id). No `FOR ALL`, no `USING (true)`.
- `profiles` ownership predicate is `auth.uid() = id` (pk is the user id).
*/

-- ---------------------------------------------------------------------------
-- Reusable updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  plan text not null default 'Premium',
  plan_renews_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "delete_own_profile" on public.profiles;
create policy "delete_own_profile" on public.profiles
  for delete to authenticated using (auth.uid() = id);

create index if not exists profiles_id_idx on public.profiles(id);

-- ---------------------------------------------------------------------------
-- accounts (Plaid-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  institution text,
  account_type text not null check (account_type in ('checking','savings','credit','loan','investment','mortgage','other')),
  mask text,
  current_balance numeric not null default 0,
  available_balance numeric,
  plaid_item_id text,
  plaid_account_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

drop policy if exists "select_own_accounts" on public.accounts;
create policy "select_own_accounts" on public.accounts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_accounts" on public.accounts;
create policy "insert_own_accounts" on public.accounts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_accounts" on public.accounts;
create policy "update_own_accounts" on public.accounts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_accounts" on public.accounts;
create policy "delete_own_accounts" on public.accounts
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists accounts_user_id_idx on public.accounts(user_id);

-- ---------------------------------------------------------------------------
-- Extend existing tables with new columns (idempotent)
-- ---------------------------------------------------------------------------
do $$
begin
  alter table public.budget_categories alter column user_id set default auth.uid();

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='budget_categories'
                   and column_name='month_key') then
    alter table public.budget_categories add column month_key text not null default to_char(now(), 'YYYY-MM');
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='budget_categories'
                   and column_name='template_name') then
    alter table public.budget_categories add column template_name text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='budget_categories'
                   and column_name='rollover') then
    alter table public.budget_categories add column rollover boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='budget_categories'
                   and column_name='notes') then
    alter table public.budget_categories add column notes text;
  end if;

  alter table public.transactions alter column user_id set default auth.uid();

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='transactions'
                   and column_name='notes') then
    alter table public.transactions add column notes text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='transactions'
                   and column_name='receipt_url') then
    alter table public.transactions add column receipt_url text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='transactions'
                   and column_name='is_recurring') then
    alter table public.transactions add column is_recurring boolean not null default false;
  end if;

  alter table public.goals alter column user_id set default auth.uid();

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='goals'
                   and column_name='notes') then
    alter table public.goals add column notes text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='goals'
                   and column_name='priority') then
    alter table public.goals add column priority integer not null default 0;
  end if;

  alter table public.investments alter column user_id set default auth.uid();

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='investments'
                   and column_name='notes') then
    alter table public.investments add column notes text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='investments'
                   and column_name='institution') then
    alter table public.investments add column institution text;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Replace FOR ALL policies with per-verb policies on existing tables
-- ---------------------------------------------------------------------------
drop policy if exists "users own budget" on public.budget_categories;
drop policy if exists "select_own_budget_categories" on public.budget_categories;
drop policy if exists "insert_own_budget_categories" on public.budget_categories;
drop policy if exists "update_own_budget_categories" on public.budget_categories;
drop policy if exists "delete_own_budget_categories" on public.budget_categories;
create policy "select_own_budget_categories" on public.budget_categories
  for select to authenticated using (auth.uid() = user_id);
create policy "insert_own_budget_categories" on public.budget_categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update_own_budget_categories" on public.budget_categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_budget_categories" on public.budget_categories
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "users own transactions" on public.transactions;
drop policy if exists "select_own_transactions" on public.transactions;
drop policy if exists "insert_own_transactions" on public.transactions;
drop policy if exists "update_own_transactions" on public.transactions;
drop policy if exists "delete_own_transactions" on public.transactions;
create policy "select_own_transactions" on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "insert_own_transactions" on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update_own_transactions" on public.transactions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_transactions" on public.transactions
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "users own goals" on public.goals;
drop policy if exists "select_own_goals" on public.goals;
drop policy if exists "insert_own_goals" on public.goals;
drop policy if exists "update_own_goals" on public.goals;
drop policy if exists "delete_own_goals" on public.goals;
create policy "select_own_goals" on public.goals
  for select to authenticated using (auth.uid() = user_id);
create policy "insert_own_goals" on public.goals
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update_own_goals" on public.goals
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_goals" on public.goals
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "users own investments" on public.investments;
drop policy if exists "select_own_investments" on public.investments;
drop policy if exists "insert_own_investments" on public.investments;
drop policy if exists "update_own_investments" on public.investments;
drop policy if exists "delete_own_investments" on public.investments;
create policy "select_own_investments" on public.investments
  for select to authenticated using (auth.uid() = user_id);
create policy "insert_own_investments" on public.investments
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update_own_investments" on public.investments
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_investments" on public.investments
  for delete to authenticated using (auth.uid() = user_id);

-- Indexes for common query patterns
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(transaction_date desc);
create index if not exists transactions_category_idx on public.transactions(category);
create index if not exists budget_categories_user_month_idx on public.budget_categories(user_id, month_key);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists investments_user_id_idx on public.investments(user_id);

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  note text,
  capital numeric not null default 0,
  risk integer not null default 3 check (risk between 1 and 5),
  effort integer not null default 3 check (effort between 1 and 5),
  score integer not null default 50 check (score between 0 and 100),
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;
drop policy if exists "select_own_opportunities" on public.opportunities;
create policy "select_own_opportunities" on public.opportunities
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_opportunities" on public.opportunities;
create policy "insert_own_opportunities" on public.opportunities
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_opportunities" on public.opportunities;
create policy "update_own_opportunities" on public.opportunities
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_opportunities" on public.opportunities;
create policy "delete_own_opportunities" on public.opportunities
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists opportunities_user_id_idx on public.opportunities(user_id);

-- ---------------------------------------------------------------------------
-- reports (saved executive brief snapshots)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  period text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
drop policy if exists "select_own_reports" on public.reports;
create policy "select_own_reports" on public.reports
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_reports" on public.reports;
create policy "insert_own_reports" on public.reports
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_reports" on public.reports;
create policy "update_own_reports" on public.reports
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_reports" on public.reports;
create policy "delete_own_reports" on public.reports
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists reports_user_id_idx on public.reports(user_id);

-- ---------------------------------------------------------------------------
-- forecasts (saved scenario snapshots)
-- ---------------------------------------------------------------------------
create table if not exists public.forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  horizon_years integer not null default 6,
  assumptions jsonb not null default '{}'::jsonb,
  series jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.forecasts enable row level security;
drop policy if exists "select_own_forecasts" on public.forecasts;
create policy "select_own_forecasts" on public.forecasts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_forecasts" on public.forecasts;
create policy "insert_own_forecasts" on public.forecasts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_forecasts" on public.forecasts;
create policy "update_own_forecasts" on public.forecasts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_forecasts" on public.forecasts;
create policy "delete_own_forecasts" on public.forecasts
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists forecasts_user_id_idx on public.forecasts(user_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info' check (kind in ('info','alert','success','warning')),
  link_view text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "select_own_notifications" on public.notifications;
create policy "select_own_notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_notifications" on public.notifications;
create policy "insert_own_notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_notifications" on public.notifications;
create policy "update_own_notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_notifications" on public.notifications;
create policy "delete_own_notifications" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_unread_idx on public.notifications(user_id, read) where read = false;

-- ---------------------------------------------------------------------------
-- settings (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  monthly_income numeric not null default 5600,
  monthly_expenses numeric not null default 4975,
  target_savings_rate numeric not null default 0.22,
  net_worth numeric not null default 23750,
  inflation_rate numeric not null default 0.03,
  income_growth_rate numeric not null default 0.045,
  investment_return_rate numeric not null default 0.035,
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists "select_own_settings" on public.settings;
create policy "select_own_settings" on public.settings
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_settings" on public.settings;
create policy "insert_own_settings" on public.settings
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update_own_settings" on public.settings;
create policy "update_own_settings" on public.settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete_own_settings" on public.settings;
create policy "delete_own_settings" on public.settings
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_categories_updated_at on public.budget_categories;
create trigger budget_categories_updated_at before update on public.budget_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists investments_updated_at on public.investments;
create trigger investments_updated_at before update on public.investments
  for each row execute function public.touch_updated_at();

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile + settings on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
