create table if not exists profiles (
  id uuid primary key,
  email text,
  stripe_customer_id text,
  subscription_status text default 'inactive',
  plan_tier text default 'none',
  created_at timestamp with time zone default now()
);
