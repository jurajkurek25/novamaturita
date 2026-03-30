-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup + give bonus credits
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 10);

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 10, 'bonus', 'Uvítací bonus pri registrácii');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SUBJECTS
-- ============================================================
create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  is_builtin boolean not null default false,
  language text not null default 'sk',
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "Users can view own subjects and builtins"
  on public.subjects for select
  using (auth.uid() = user_id);

create policy "Users can insert own subjects"
  on public.subjects for insert
  with check (auth.uid() = user_id and is_builtin = false);

create policy "Users can delete own non-builtin subjects"
  on public.subjects for delete
  using (auth.uid() = user_id and is_builtin = false);

-- ============================================================
-- TOPICS (okruhy)
-- ============================================================
create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  content text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;

create policy "Users can view topics of own subjects"
  on public.topics for select
  using (
    exists (
      select 1 from public.subjects s
      where s.id = topics.subject_id and s.user_id = auth.uid()
    )
  );

create policy "Users can manage topics of own non-builtin subjects"
  on public.topics for all
  using (
    exists (
      select 1 from public.subjects s
      where s.id = topics.subject_id
        and s.user_id = auth.uid()
        and s.is_builtin = false
    )
  );

-- ============================================================
-- EXAM SESSIONS
-- ============================================================
create table public.exam_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) not null,
  topic_id uuid references public.topics(id) not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  evaluation jsonb,
  credits_used integer not null default 10
);

alter table public.exam_sessions enable row level security;

create policy "Users can view own sessions"
  on public.exam_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.exam_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.exam_sessions for update
  using (auth.uid() = user_id);

-- ============================================================
-- CREDIT TRANSACTIONS
-- ============================================================
create table public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('purchase', 'usage', 'bonus')),
  description text not null,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;

create policy "Users can view own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- ============================================================
-- HELPER: deduct credits + log transaction atomically
-- ============================================================
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_session_id uuid default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_credits integer;
begin
  select credits into v_credits from public.profiles where id = p_user_id for update;
  if v_credits < p_amount then
    return false;
  end if;

  update public.profiles set credits = credits - p_amount, updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (p_user_id, -p_amount, 'usage', p_description);

  return true;
end;
$$;

-- ============================================================
-- HELPER: add credits after Stripe purchase
-- ============================================================
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_stripe_payment_intent_id text
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles set credits = credits + p_amount, updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, description, stripe_payment_intent_id)
  values (p_user_id, p_amount, 'purchase', p_description, p_stripe_payment_intent_id);
end;
$$;
