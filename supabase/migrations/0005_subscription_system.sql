-- 0005_subscription_system.sql
-- Subscription plans, user subscriptions, and redeem codes.
-- Replaces the access_codes system with a proper SaaS billing model.

-- ===== plans =================================================================
-- Defines subscription tiers. Seeded with Free/Plus/PRO.
-- monthly_credits = 0 means unlimited (PRO plan).
-- monthly_credits can be set to 0 for Free during contest phase.

create table if not exists public.plans (
  id text primary key,  -- 'free', 'plus', 'pro'
  name text not null,  -- display name: 'Free', 'Plus', 'PRO'
  monthly_credits int not null,  -- 0 = unlimited for pro, else credits/month
  max_rounds int not null,  -- max grill rounds per session, 0 = unlimited
  model_access text not null default 'basic',  -- 'basic', 'advanced', 'all'
  price_monthly int not null default 0,  -- in CNY cents (0 = free)
  price_yearly int not null default 0,  -- in CNY cents (0 = free)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed plans
insert into public.plans (id, name, monthly_credits, max_rounds, model_access, price_monthly, price_yearly, sort_order) values
  ('free', 'Free', 0, 8, 'basic', 0, 0, 0),
  ('plus', 'Plus', 200, 15, 'advanced', 2000, 20000, 1),
  ('pro', 'PRO', 0, 0, 'all', 10000, 100000, 2)
on conflict (id) do nothing;

-- ===== subscriptions =========================================================
-- One row per user. Tracks current plan, credits, and billing period.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  credits_remaining int not null default 0,
  credits_used int not null default 0,
  -- For paid plans: billing period. For free: credits reset monthly.
  current_period_start timestamptz,
  current_period_end timestamptz,
  -- Payment status for paid plans: 'active', 'past_due', 'canceled'
  -- For free plan: always 'active'
  status text not null default 'active'
    check (status in ('active', 'past_due', 'canceled')),
  -- Additional credits from redeem codes (never expire, used after monthly credits)
  bonus_credits int not null default 0,
  bonus_credits_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions (user_id);
create index if not exists idx_subscriptions_plan on public.subscriptions (plan_id);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription
drop policy if exists "select_subscriptions_own" on public.subscriptions;
create policy "select_subscriptions_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Users can update their own subscription (for credit deduction via RPC)
drop policy if exists "update_subscriptions_own" on public.subscriptions;
create policy "update_subscriptions_own"
  on public.subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin can read all subscriptions
drop policy if exists "admin_all_subscriptions" on public.subscriptions;
create policy "admin_all_subscriptions"
  on public.subscriptions for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- ===== redeem_codes ==========================================================
-- One-time redemption codes (replace access_codes).
-- Each code can be used by multiple users (up to max_uses total),
-- but each user can only use a code once.

create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  credits int not null,  -- how many credits this code grants
  max_uses int not null default 1,  -- total times this code can be used (across all users)
  used_count int not null default 0,  -- how many times it's been used so far
  expires_at timestamptz not null,
  note text,
  revoked boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_redeem_codes_code on public.redeem_codes (code);

alter table public.redeem_codes enable row level security;

-- Only admin can CRUD redeem codes
drop policy if exists "admin_all_redeem_codes" on public.redeem_codes;
create policy "admin_all_redeem_codes"
  on public.redeem_codes for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- ===== redeem_code_usages ====================================================
-- Tracks which user used which code (prevents double-redemption).
-- Unique constraint: one user per code.

create table if not exists public.redeem_code_usages (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.redeem_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),

  constraint unique_user_per_code unique (code_id, user_id)
);

create index if not exists idx_redeem_usages_user on public.redeem_code_usages (user_id);
create index if not exists idx_redeem_usages_code on public.redeem_code_usages (code_id);

alter table public.redeem_code_usages enable row level security;

-- Users can see their own redemption history
drop policy if exists "select_redeem_usages_own" on public.redeem_code_usages;
create policy "select_redeem_usages_own"
  on public.redeem_code_usages for select
  using (user_id = auth.uid());

-- ===== SECURITY DEFINER functions ===========================================

-- Redeem a code: atomically check validity, record usage, and grant credits.
-- Returns jsonb: { success, reason?, credits_granted?, remaining? }
create or replace function public.redeem_code(
  p_code text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_row redeem_codes%rowtype;
  v_already_used int;
  v_plan_credits int;
  v_new_bonus int;
begin
  -- Look up the code
  select * into v_code_row from redeem_codes where redeem_codes.code = p_code;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  if v_code_row.revoked then
    return jsonb_build_object('success', false, 'reason', 'revoked');
  end if;

  if v_code_row.expires_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'expired');
  end if;

  if v_code_row.used_count >= v_code_row.max_uses then
    return jsonb_build_object('success', false, 'reason', 'fully_used');
  end if;

  -- Check if this user already used this code
  select count(*) into v_already_used
  from redeem_code_usages
  where code_id = v_code_row.id and user_id = p_user_id;

  if v_already_used > 0 then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end if;

  -- Atomic: increment used_count and record usage
  update redeem_codes
  set used_count = used_count + 1
  where id = v_code_row.id and used_count < max_uses;

  if not found then
    -- Race condition: someone else used it first
    return jsonb_build_object('success', false, 'reason', 'fully_used');
  end if;

  -- Record the usage
  insert into redeem_code_usages (code_id, user_id)
  values (v_code_row.id, p_user_id);

  -- Ensure the user has a subscription row
  insert into subscriptions (user_id, plan_id, credits_remaining, credits_used, status)
  values (p_user_id, 'free', 0, 0, 'active')
  on conflict (user_id) do nothing;

  -- Add credits as bonus credits (these never expire)
  update subscriptions
  set bonus_credits = bonus_credits + v_code_row.credits,
      updated_at = now()
  where user_id = p_user_id;

  -- Get updated bonus info
  select bonus_credits - bonus_credits_used into v_new_bonus
  from subscriptions where user_id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'credits_granted', v_code_row.credits,
    'bonus_remaining', v_new_bonus
  );
end;
$$;

-- Deduct one credit from a user's subscription.
-- Uses monthly credits first, then bonus credits.
-- Returns jsonb: { allowed, reason?, remaining? }
-- For PRO plan (monthly_credits = 0): always allowed, no deduction.
create or replace function public.deduct_subscription_credit(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub subscriptions%rowtype;
  v_plan plans%rowtype;
  v_remaining int;
begin
  -- Get the user's subscription
  select * into v_sub from subscriptions where user_id = p_user_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  end if;

  -- Get the plan details
  select * into v_plan from plans where id = v_sub.plan_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_plan');
  end if;

  -- PRO plan: unlimited credits, no deduction needed
  if v_plan.monthly_credits = 0 then
    return jsonb_build_object('allowed', true, 'remaining', -1);
  end if;

  -- Try to deduct from monthly credits first
  if v_sub.credits_remaining > 0 then
    update subscriptions
    set credits_remaining = credits_remaining - 1,
        credits_used = credits_used + 1,
        updated_at = now()
    where user_id = p_user_id and credits_remaining > 0
    returning credits_remaining into v_remaining;

    if v_remaining is not null then
      return jsonb_build_object('allowed', true, 'remaining', v_remaining);
    end if;
  end if;

  -- Monthly credits exhausted, try bonus credits
  if v_sub.bonus_credits - v_sub.bonus_credits_used > 0 then
    update subscriptions
    set bonus_credits_used = bonus_credits_used + 1,
        updated_at = now()
    where user_id = p_user_id and (bonus_credits - bonus_credits_used) > 0
    returning (bonus_credits - bonus_credits_used) into v_remaining;

    if v_remaining is not null then
      return jsonb_build_object('allowed', true, 'remaining', v_remaining);
    end if;
  end if;

  -- No credits available
  return jsonb_build_object('allowed', false, 'reason', 'no_credits');
end;
$$;

-- Reset monthly credits for a user (called at billing period start or monthly reset).
-- For free plan: resets to the plan's monthly_credits amount.
-- For paid plans: resets to the plan's monthly_credits amount.
create or replace function public.reset_monthly_credits(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_credits int;
  v_now timestamptz := now();
  v_period_end timestamptz;
begin
  select monthly_credits into v_plan_credits from plans p
  inner join subscriptions s on s.plan_id = p.id
  where s.user_id = p_user_id;

  -- Calculate next period end (1 month from now)
  v_period_end := v_now + interval '1 month';

  update subscriptions
  set credits_remaining = v_plan_credits,
      credits_used = 0,
      current_period_start = v_now,
      current_period_end = v_period_end,
      updated_at = v_now
  where user_id = p_user_id
  returning credits_remaining into v_plan_credits;

  if v_plan_credits is null then
    return jsonb_build_object('success', false, 'reason', 'no_subscription');
  end if;

  return jsonb_build_object('success', true, 'credits_remaining', v_plan_credits);
end;
$$;

-- ===== Auto-provision subscription on signup =================================
-- When a new user is created, auto-create a free subscription.
-- Modify the existing handle_new_user trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Auto-create free subscription
  insert into public.subscriptions (user_id, plan_id, credits_remaining, credits_used, status, current_period_start, current_period_end)
  values (
    new.id,
    'free',
    (select monthly_credits from plans where id = 'free'),
    0,
    'active',
    now(),
    now() + interval '1 month'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ===== Triggers ================================================================

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ===== Backfill: create free subscriptions for all existing users ==============
-- This ensures users who registered before this migration also get a Free plan.

insert into public.subscriptions (user_id, plan_id, credits_remaining, credits_used, status, current_period_start, current_period_end)
select
  p.id,
  'free',
  (select monthly_credits from plans where id = 'free'),
  0,
  'active',
  now(),
  now() + interval '1 month'
from public.profiles p
where not exists (
  select 1 from public.subscriptions s where s.user_id = p.id
)
on conflict (user_id) do nothing;