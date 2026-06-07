alter table public.transactions
  add column if not exists source text,
  add column if not exists reference_type text,
  add column if not exists reference_id text;

create table if not exists public.paylaters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  item_name text not null,
  total_amount double precision not null,
  remaining_balance double precision not null,
  installment_amount double precision not null,
  due_day text,
  due_date timestamptz,
  installment_count double precision,
  start_date timestamptz not null,
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create table if not exists public.paylater_payments (
  id text primary key,
  paylater_id text not null references public.paylaters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount double precision not null,
  payment_date timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  last_synced_at timestamptz
);

create index if not exists transactions_reference_idx
  on public.transactions (source, reference_type, reference_id);
create index if not exists paylaters_user_updated_idx
  on public.paylaters (user_id, updated_at, id);
create index if not exists paylaters_status_idx
  on public.paylaters (user_id, status);
create index if not exists paylater_payments_user_updated_idx
  on public.paylater_payments (user_id, updated_at, id);
create index if not exists paylater_payments_paylater_idx
  on public.paylater_payments (paylater_id);

drop trigger if exists paylaters_set_updated_at on public.paylaters;
create trigger paylaters_set_updated_at
before update on public.paylaters
for each row execute procedure public.set_updated_at();

drop trigger if exists paylater_payments_set_updated_at on public.paylater_payments;
create trigger paylater_payments_set_updated_at
before update on public.paylater_payments
for each row execute procedure public.set_updated_at();

alter table public.paylaters enable row level security;
alter table public.paylater_payments enable row level security;

drop policy if exists "paylaters_select_own" on public.paylaters;
create policy "paylaters_select_own"
on public.paylaters for select
using (auth.uid() = user_id);

drop policy if exists "paylaters_insert_own" on public.paylaters;
create policy "paylaters_insert_own"
on public.paylaters for insert
with check (auth.uid() = user_id);

drop policy if exists "paylaters_update_own" on public.paylaters;
create policy "paylaters_update_own"
on public.paylaters for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "paylater_payments_select_own" on public.paylater_payments;
create policy "paylater_payments_select_own"
on public.paylater_payments for select
using (auth.uid() = user_id);

drop policy if exists "paylater_payments_insert_own" on public.paylater_payments;
create policy "paylater_payments_insert_own"
on public.paylater_payments for insert
with check (auth.uid() = user_id);

drop policy if exists "paylater_payments_update_own" on public.paylater_payments;
create policy "paylater_payments_update_own"
on public.paylater_payments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
