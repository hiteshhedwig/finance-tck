-- =====================================================
-- Finance Tracker — Nhost / Hasura Schema
-- Run this in Hasura Console → Data → SQL
-- After running, track all tables and set up
-- relationships + permissions in Hasura Console.
-- See SETUP.md for step-by-step instructions.
-- =====================================================

-- ENUMS
create type transaction_type as enum (
  'income', 'expense', 'transfer', 'investment', 'debt_payment', 'cc_payment'
);
create type account_type as enum ('bank', 'cash', 'credit_card');
create type payment_mode as enum ('upi', 'bank_transfer', 'cash', 'credit_card', 'neft', 'imps');
create type recurrence_interval as enum ('daily', 'weekly', 'monthly', 'yearly');

-- PROFILES
-- id matches auth.users.id managed by Nhost Auth
create table profiles (
  id uuid primary key,
  full_name text,
  salary_day int not null default 7,
  default_month_mode text not null default 'salary_cycle',
  created_at timestamptz default now()
);

-- ACCOUNTS
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type account_type not null,
  balance numeric(12,2) not null default 0,
  color text,
  icon text,
  is_active boolean not null default true,
  notes text,
  credit_limit numeric(12,2),
  statement_day int default 1,
  due_day int default 21,
  created_at timestamptz default now()
);

-- CATEGORIES
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  icon text,
  color text,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

-- TRANSACTIONS
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type transaction_type not null,
  amount numeric(12,2) not null,
  title text not null,
  notes text,
  date date not null,
  category_id uuid references categories(id) on delete set null,
  payment_mode payment_mode,
  from_account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  statement_month date,
  is_recurring boolean not null default false,
  recurring_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CC STATEMENTS
create table cc_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid not null references accounts(id) on delete cascade,
  statement_date date not null,
  due_date date not null,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  is_paid boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, account_id, statement_date)
);

-- RECURRING TRANSACTIONS
create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type transaction_type not null,
  amount numeric(12,2) not null,
  title text not null,
  category_id uuid references categories(id) on delete set null,
  payment_mode payment_mode,
  from_account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  interval recurrence_interval not null default 'monthly',
  day_of_month int,
  is_active boolean not null default true,
  next_due date,
  created_at timestamptz default now()
);

-- INDEXES
create index transactions_user_date on transactions(user_id, date desc);
create index transactions_user_type on transactions(user_id, type);
create index transactions_statement_month on transactions(user_id, statement_month);
create index transactions_from_account on transactions(from_account_id);
create index transactions_to_account on transactions(to_account_id);
create index accounts_user on accounts(user_id);
create index categories_user on categories(user_id);
create index cc_statements_user on cc_statements(user_id);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
before update on transactions
for each row execute procedure update_updated_at();

-- NOTE: No RLS policies here.
-- Permissions are set in Hasura Console → table → Permissions tab.
-- Role "user" with filter:
--   { "user_id": { "_eq": "X-Hasura-User-Id" } }   (all tables except profiles)
--   { "id":      { "_eq": "X-Hasura-User-Id" } }   (profiles table)
