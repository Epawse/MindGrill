-- 0002_user_provider_keys.sql
-- Per-user encrypted API key storage for LLM providers.
-- One row per key (not comma-separated) per D1.3.
-- RLS: users can only CRUD their own keys.

create table if not exists public.user_provider_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_id text not null check (
    provider_id in (
      'openai', 'anthropic', 'google', 'deepseek',
      'qwen', 'glm', 'hunyuan', 'doubao',
      'ollama-cloud', 'openai-compatible'
    )
  ),
  encrypted_key text not null,
  key_hint text not null,
  base_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_provider_keys_user_id
  on public.user_provider_keys (user_id);

create index if not exists idx_user_provider_keys_user_provider
  on public.user_provider_keys (user_id, provider_id);

alter table public.user_provider_keys enable row level security;

-- Users can only read their own keys
drop policy if exists "select_own_keys" on public.user_provider_keys;
create policy "select_user_provider_keys_own"
  on public.user_provider_keys for select
  using (user_id = auth.uid());

-- Users can only insert their own keys
drop policy if exists "insert_own_keys" on public.user_provider_keys;
create policy "insert_user_provider_keys_own"
  on public.user_provider_keys for insert
  with check (user_id = auth.uid());

-- Users can only update their own keys
drop policy if exists "update_own_keys" on public.user_provider_keys;
create policy "update_user_provider_keys_own"
  on public.user_provider_keys for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can only delete their own keys
drop policy if exists "delete_own_keys" on public.user_provider_keys;
create policy "delete_user_provider_keys_own"
  on public.user_provider_keys for delete
  using (user_id = auth.uid());

-- Auto-bump updated_at
drop trigger if exists trg_user_provider_keys_updated on public.user_provider_keys;
create trigger trg_user_provider_keys_updated
  before update on public.user_provider_keys
  for each row execute function public.touch_updated_at();