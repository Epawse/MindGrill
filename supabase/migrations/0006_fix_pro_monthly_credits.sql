-- 0006_fix_pro_monthly_credits.sql
-- Fix: PRO plan monthly_credits should be -1 (unlimited), not 0 (no credits).
-- Free plan correctly uses 0 for "no credits during contest phase".

update public.plans set monthly_credits = -1 where id = 'pro';

-- Also update the deduct function to check -1 instead of 0 for unlimited.
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
  select * into v_sub from subscriptions where user_id = p_user_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  end if;

  select * into v_plan from plans where id = v_sub.plan_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_plan');
  end if;

  -- PRO plan: unlimited credits (monthly_credits = -1), no deduction needed.
  if v_plan.monthly_credits = -1 then
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

-- Also update reset_monthly_credits to handle -1 correctly.
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

  -- PRO plan: no reset needed (unlimited)
  if v_plan_credits = -1 then
    return jsonb_build_object('success', true, 'credits_remaining', -1);
  end if;

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
