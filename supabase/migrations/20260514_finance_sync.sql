create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  currency_code text not null default 'PHP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  name text not null,
  account_holder_name text,
  balance double precision not null default 0,
  currency_code text not null default 'PHP',
  account_number_last4 text,
  color text,
  icon text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  name text not null,
  icon text,
  icon_type text not null default 'vector',
  icon_name text,
  icon_image_uri text,
  emoji text,
  color text,
  is_default boolean not null default false,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.merchants (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  logo_uri text,
  default_category_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  amount double precision not null,
  currency_code text not null default 'PHP',
  category_id text,
  merchant_id text,
  account_id text not null,
  transfer_account_id text,
  merchant_name text,
  notes text,
  transaction_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  amount double precision not null,
  spent double precision not null default 0,
  period text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.saving_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount double precision not null,
  current_amount double precision not null default 0,
  target_date timestamptz not null,
  icon_type text not null default 'vector',
  icon_name text,
  icon_image_uri text,
  emoji text,
  color text,
  linked_wallet_id text,
  is_completed boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.goal_contributions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  wallet_id text,
  amount double precision not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create index if not exists accounts_user_updated_idx on public.accounts (user_id, updated_at, id);
create index if not exists categories_user_updated_idx on public.categories (user_id, updated_at, id);
create index if not exists merchants_user_updated_idx on public.merchants (user_id, updated_at, id);
create index if not exists transactions_user_updated_idx on public.transactions (user_id, updated_at, id);
create index if not exists budgets_user_updated_idx on public.budgets (user_id, updated_at, id);
create index if not exists saving_goals_user_updated_idx on public.saving_goals (user_id, updated_at, id);
create index if not exists goal_contributions_user_updated_idx on public.goal_contributions (user_id, updated_at, id);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute procedure public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
drop trigger if exists merchants_set_updated_at on public.merchants;
create trigger merchants_set_updated_at before update on public.merchants for each row execute procedure public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets for each row execute procedure public.set_updated_at();
drop trigger if exists saving_goals_set_updated_at on public.saving_goals;
create trigger saving_goals_set_updated_at before update on public.saving_goals for each row execute procedure public.set_updated_at();
drop trigger if exists goal_contributions_set_updated_at on public.goal_contributions;
create trigger goal_contributions_set_updated_at before update on public.goal_contributions for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.merchants enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.saving_goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "merchants_select_own" on public.merchants for select using (auth.uid() = user_id);
create policy "merchants_insert_own" on public.merchants for insert with check (auth.uid() = user_id);
create policy "merchants_update_own" on public.merchants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saving_goals_select_own" on public.saving_goals for select using (auth.uid() = user_id);
create policy "saving_goals_insert_own" on public.saving_goals for insert with check (auth.uid() = user_id);
create policy "saving_goals_update_own" on public.saving_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goal_contributions_select_own" on public.goal_contributions for select using (auth.uid() = user_id);
create policy "goal_contributions_insert_own" on public.goal_contributions for insert with check (auth.uid() = user_id);
create policy "goal_contributions_update_own" on public.goal_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
