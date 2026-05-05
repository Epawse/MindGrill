-- 0004_access_codes_rls.sql
-- Retroactively add RLS + SECURITY DEFINER functions to access_codes table.
-- Migration 0003 created the table but was pushed before RLS and
-- SECURITY DEFINER functions were added during quality check.

-- Enable RLS on access_codes (table already exists from 0003)
alter table public.access_codes enable row level security;

-- Admin-only RLS policy
drop policy if exists "admin_all_access_codes" on public.access_codes;
create policy "admin_all_access_codes"
  on public.access_codes for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- SECURITY DEFINER function: check if a code is valid (boolean, for middleware fast-path)
create or replace function public.is_access_code_valid(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists(
    select 1 from access_codes
    where code = p_code
      and not revoked
      and expires_at > now()
      and quota_used < quota_total
  );
end;
$$;

-- SECURITY DEFINER function: validate a code and return details (for /api/access-codes/verify)
create or replace function public.validate_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row access_codes%rowtype;
begin
  select * into v_row from access_codes where access_codes.code = p_code;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_row.revoked then
    return jsonb_build_object(
      'valid', false,
      'reason', 'revoked',
      'codeRow', to_jsonb(v_row)
    );
  end if;

  if v_row.expires_at <= now() then
    return jsonb_build_object(
      'valid', false,
      'reason', 'expired',
      'codeRow', to_jsonb(v_row)
    );
  end if;

  if v_row.quota_used >= v_row.quota_total then
    return jsonb_build_object(
      'valid', false,
      'reason', 'quota_exhausted',
      'codeRow', to_jsonb(v_row)
    );
  end if;

  return jsonb_build_object('valid', true, 'codeRow', to_jsonb(v_row));
end;
$$;

-- SECURITY DEFINER function: atomically deduct one quota unit (for grill API routes)
-- The UPDATE ... WHERE ... RETURNING ensures no race condition.
create or replace function public.deduct_access_code_quota(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_remaining int;
begin
  update access_codes
  set quota_used = quota_used + 1,
      last_used_at = now()
  where code = p_code
    and not revoked
    and expires_at > now()
    and quota_used < quota_total
  returning id, quota_total - quota_used into v_id, v_remaining;

  if v_id is not null then
    return jsonb_build_object(
      'allowed', true,
      'remaining', v_remaining
    );
  end if;

  if not exists (select 1 from access_codes where access_codes.code = p_code) then
    return jsonb_build_object('allowed', false, 'reason', 'not_found');
  end if;

  if exists (select 1 from access_codes where access_codes.code = p_code and revoked) then
    return jsonb_build_object('allowed', false, 'reason', 'revoked');
  end if;

  if exists (select 1 from access_codes where access_codes.code = p_code and expires_at <= now()) then
    return jsonb_build_object('allowed', false, 'reason', 'expired');
  end if;

  return jsonb_build_object('allowed', false, 'reason', 'quota_exhausted');
end;
$$;