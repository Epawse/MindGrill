-- 0003_access_codes.sql
-- Access code table (code = quota) + is_admin field on profiles.
-- RLS enabled: only admin users can directly CRUD; public access via
-- SECURITY DEFINER functions (code validation, quota deduction).

-- Access codes table
create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  quota_total int not null default 30,
  quota_used int not null default 0,
  expires_at timestamptz not null,
  note text,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_access_codes_code
  on public.access_codes (code);

-- Enable RLS: anonymous users cannot directly query/modify codes.
-- Without RLS, anyone with the public anon key could enumerate all codes
-- and their remaining quotas — a serious security leak.
alter table public.access_codes enable row level security;

-- Admin users (is_admin = true on their profile) can do everything.
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

-- Add is_admin to profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- -----------------------------------------------------------------------
-- SECURITY DEFINER functions: bypass RLS for public operations
-- (code validation, quota deduction). These run as the function creator
-- (superuser), not as the caller, so they can read/write the table
-- regardless of RLS policies. This is the standard Supabase pattern for
-- "public API + private data" — same approach as handle_new_user().
-- -----------------------------------------------------------------------

-- Check if a code is valid (boolean only, for middleware fast-path).
-- Returns true iff the code exists, is not revoked, not expired, and
-- has remaining quota.
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

-- Validate a code and return details (for /api/access-codes/verify).
-- Returns JSONB: { valid, reason?, codeRow? }
-- codeRow is the full row when the code exists (even if invalid),
-- so the caller can report remaining quota.
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

-- Atomically deduct one quota unit from a code (for grill API routes).
-- Returns JSONB: { allowed, reason?, remaining? }
--
-- This is atomic: the UPDATE ... WHERE ... RETURNING ensures no race
-- condition — two concurrent requests cannot both pass the quota check
-- and both increment, which would allow over-quota usage.
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
  -- Atomically increment quota_used and update last_used_at.
  -- Only succeeds if code is valid and has remaining quota.
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

  -- Determine the reason for failure.
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