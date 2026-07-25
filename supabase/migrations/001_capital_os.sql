create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  name text not null, icon text default '💰', budget numeric not null default 0, actual numeric not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  transaction_date date not null, merchant text not null, category text not null,
  amount numeric not null, direction text check(direction in ('income','expense')), status text check(status in ('cleared','pending')),
  created_at timestamptz default now()
);
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  name text not null, target numeric not null, current numeric not null default 0, due date,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users not null,
  name text not null, asset_type text, value numeric not null default 0, return_pct numeric not null default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.budget_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.investments enable row level security;
create policy "users own budget" on public.budget_categories for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users own transactions" on public.transactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users own goals" on public.goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users own investments" on public.investments for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
