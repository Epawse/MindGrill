-- 0001_init.sql — MindGrill (辩思) initial schema
--
-- Two tables (profiles + grill_sessions) per .trellis/spec/backend/database-guidelines.md.
-- All user-owned data is RLS-locked to auth.uid().
-- tree_snapshot stores the full GrillSession (id/scenario/draft/phase/rootId/
--   activeNodeId/nodes map/revision/timestamps) as serialized JSON.

create extension if not exists "pgcrypto";

-- ----- profiles -----------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "select_profiles_own" on public.profiles;
create policy "select_profiles_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "insert_profiles_own" on public.profiles;
create policy "insert_profiles_own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "update_profiles_own" on public.profiles;
create policy "update_profiles_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-provision a profile when a new auth.users row appears.
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- grill_sessions -----------------------------------------------------

create table if not exists public.grill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario text not null check (scenario in ('thesis', 'resume', 'social')),
  draft text not null,
  tree_snapshot jsonb not null default '{}',
  revised_draft text,
  revision jsonb,
  phase text not null default 'INTAKE'
    check (phase in ('INTAKE', 'GRILLING', 'THINKING', 'COMPLETE')),
  status text not null default 'grilling'
    check (status in ('grilling', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_sessions_user_updated
  on public.grill_sessions (user_id, updated_at desc);

alter table public.grill_sessions enable row level security;

drop policy if exists "select_sessions_own" on public.grill_sessions;
create policy "select_sessions_own"
  on public.grill_sessions for select
  using (user_id = auth.uid());

drop policy if exists "insert_sessions_own" on public.grill_sessions;
create policy "insert_sessions_own"
  on public.grill_sessions for insert
  with check (user_id = auth.uid());

drop policy if exists "update_sessions_own" on public.grill_sessions;
create policy "update_sessions_own"
  on public.grill_sessions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "delete_sessions_own" on public.grill_sessions;
create policy "delete_sessions_own"
  on public.grill_sessions for delete
  using (user_id = auth.uid());

-- updated_at auto-bump
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_grill_sessions_updated on public.grill_sessions;
create trigger trg_grill_sessions_updated
  before update on public.grill_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();
