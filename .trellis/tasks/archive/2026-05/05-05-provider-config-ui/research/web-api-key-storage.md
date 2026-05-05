# Research: Web API Key Storage and Provider Configuration

- **Query**: How do web-based AI apps handle LLM API key storage and provider configuration UI, specifically for Next.js 14 App Router on Vercel?
- **Scope**: Mixed (internal codebase + external: Open WebUI, Next.js patterns)
- **Date**: 2026-05-04

## Findings

### 1. Current Project Architecture (MindGrill)

The project currently uses **server-side environment variables exclusively** for API key storage. There is no per-user key storage.

| File Path | Description |
|---|---|
| `src/lib/ai/provider-registry.ts` | Pure data: 10 providers with `envKey` fields (e.g., `OPENAI_API_KEY`) |
| `src/lib/ai/key-rotation.ts` | Multi-key rotation: comma-separated env vars, in-memory blacklist |
| `src/lib/ai/registry.ts` | Lazy `createProviderRegistry` built from `process.env` on first access |
| `src/lib/ai/factory.ts` | `getModel()` reads env via `readEnv()`, delegates to registry |
| `src/lib/ai/health-check.ts` | `getProviderHealth()` checks `process.env[meta.envKey]` per provider |
| `src/lib/ai/defaults.ts` | Provider preference order + `resolveProvider()` |
| `src/lib/ai/router.ts` | `withFallback()` cross-provider failover middleware |
| `src/app/api/health/providers/route.ts` | GET endpoint exposing configured/keyCount status |
| `src/hooks/use-provider-health.ts` | Client hook fetching `/api/health/providers` |
| `src/app/api/grill/start/route.ts` | API route calling `withFallback()` + `getModel()` |
| `src/lib/supabase/server.ts` | Server-side Supabase client (cookie-based auth) |
| `supabase/migrations/0001_init.sql` | DB schema: profiles + grill_sessions (no API key table) |

**Key constraint in current code**: `factory.ts` line 25-27:
```typescript
function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}
```
All key resolution goes through `process.env`. There is no database or session-based key lookup.

**Health endpoint contract** (`health-check.ts` lines 25-46): Returns `ProviderHealth` with `configured: boolean`, `keyCount: number`, `missingEnv: string[]`. Never returns the key value.

---

### 2. Open WebUI Key Storage Architecture

Open WebUI (github.com/open-webui/open-webui) is a **self-hosted Python/FastAPI web app** (not Next.js). Its architecture differs significantly but provides relevant patterns.

#### 2a. Global/Admin API Key Storage: PersistentConfig + DB

Open WebUI stores API keys as **plaintext in a JSON column in SQLite/PostgreSQL** via the `PersistentConfig` system.

- `backend/open_webui/config.py`: `PersistentConfig` class wraps each config value
  - Constructor reads from DB first (`get_config_value(config_path)`), falls back to env var
  - `save()` / `async_save()` persists to `config` table (single-row JSON blob)
  - Keys like `OPENAI_API_KEYS` are stored as `list[str]` in the JSON blob
  - Keys are stored in `app.state.config` (in-memory) and persisted to DB

- `backend/open_webui/routers/openai.py` line ~155-165: `update_config()` accepts `OPENAI_API_KEYS: list[str]` and stores them directly via `request.app.state.config.OPENAI_API_KEYS = form_data.OPENAI_API_KEYS`

- Key resolution at request time (line ~260): `key = request.app.state.config.OPENAI_API_KEYS[idx]` where `idx` maps to the model's `urlIdx`

**Pattern**: Admin configures global keys via UI -> saved to DB as plaintext JSON -> loaded into app memory at runtime -> resolved by index at request time.

#### 2b. Encryption: Fernet for OAuth Only, NOT for LLM API Keys

- `backend/open_webui/utils/oauth.py` uses `cryptography.fernet.Fernet` with `WEBUI_SECRET_KEY` / `OAUTH_CLIENT_INFO_ENCRYPTION_KEY` as the Fernet key
- `encrypt_data()` / `decrypt_data()` are used **only for OAuth client secrets**, not for LLM API keys
- LLM API keys are stored as **plaintext** in the config JSON

**Why plaintext is acceptable for Open WebUI**: It is self-hosted, single-admin. The admin already has full server access. The DB file is on the same machine. The threat model assumes the admin is trusted.

#### 2c. Per-User API Keys: NOT supported

- `UserSettings` model (`users.py`) has `extra='allow'` but no `openai_key` or `api_key` field
- There is no per-user LLM API key storage in Open WebUI
- The `ApiKey` model in `users.py` is for **authenticating TO Open WebUI** (API key auth for the app itself), not LLM provider keys
- `ENABLE_DIRECT_CONNECTIONS` config flag exists but routes through server-side config, not per-user keys

#### 2d. Key Management UI Pattern

Open WebUI exposes a `/api/config` endpoint (admin-only):
- GET returns current keys (masked or full, admin-only)
- POST `update_config` accepts new key arrays
- Keys are parallel arrays: `OPENAI_API_BASE_URLS[i]` paired with `OPENAI_API_KEYS[i]`
- Admin UI renders input fields for each connection (URL + key pair)
- Connection test: UI calls model list endpoint with the key to verify

---

### 3. Security Patterns for API Key Management in Next.js Web Apps

#### Pattern A: Server-Only Environment Variables (Current MindGrill approach)

- Keys in `.env.local` or Vercel environment settings
- Available only in Server Components, Route Handlers, Server Actions
- NEVER prefixed with `NEXT_PUBLIC_` (client bundle exclusion)
- **Limitation**: Requires server restart / redeploy to change keys; no per-user keys

#### Pattern B: Encrypted Database Storage + Server-Side Decryption

1. User submits API key via form -> Server Action / Route Handler
2. Server encrypts key with a server-side secret (e.g., `ENCRYPTION_KEY` env var)
3. Encrypted key stored in DB (Supabase `user_api_keys` table) with RLS
4. On API call: server reads encrypted key from DB, decrypts, uses for LLM request
5. Key never sent to client after initial storage

**Encryption approaches for Next.js**:
- Node.js `crypto.createCipheriv` / `createDecipheriv` with AES-256-GCM
- `@noble/ciphers` (lightweight, no native deps)
- Fernet via `crypto` module (compatible with Python's `cryptography.fernet`)
- Key: derived from `ENCRYPTION_KEY` env var (32 bytes for AES-256)

#### Pattern C: Server-Side Session / Runtime Key Injection

1. User enters key in UI form
2. Server Action validates key (test API call), then stores in **encrypted DB column**
3. On each LLM API request, the Route Handler:
   a. Authenticates user (Supabase session cookie)
   b. Reads user's encrypted key from DB
   c. Decrypts key
   d. Injects key into `getModel()` / `createOpenAI()` call
4. Registry is NOT used for per-user keys (it is process.env-based, shared across all users)
5. Per-user keys bypass the registry; `getModel()` is extended with an optional `apiKeyOverride` parameter

**Vercel deployment note**: Vercel serverless functions are stateless. In-memory key caches (like Open WebUI's `app.state.config`) do NOT persist across invocations. DB reads are required per request.

#### Pattern D: Hybrid (Env + Per-User Override)

1. Server env vars provide **default/fallback keys** (admin-configured)
2. Authenticated users can optionally configure **their own keys** in UI
3. Resolution order: user's key (if configured) -> server default key
4. This is the most common pattern for multi-tenant web apps

---

### 4. Vercel/Vercel AI SDK Specific Patterns

#### Vercel AI SDK 5 Provider Registry

The current MindGrill code uses `createProviderRegistry` which builds providers from env vars at startup (lazy first access). To support per-user keys:

- Option 1: Do NOT use the registry for per-user keys. Call `createOpenAI({ apiKey: userKey })` directly in the Route Handler when a user key is available.
- Option 2: Extend `getModel()` to accept an optional `apiKey` override that bypasses the registry lookup.
- Option 3: Build a per-request mini-registry (one provider) from the user's key.

**Recommended**: Option 2 is cleanest. The registry remains for env-var-based fallback. Per-user keys create SDK provider instances on the fly.

#### Vercel KV / Vercel Blob for Key Storage

- Vercel KV (Redis) can store encrypted keys per user, but adds a vendor dependency
- Not recommended for secrets (Redis is primarily a cache, not a vault)
- Supabase (already in the project) is the natural storage layer

---

### 5. Supabase-Specific Patterns for API Key Storage

Given the project already uses Supabase with RLS:

#### Proposed Schema: `user_provider_keys` table

```sql
create table public.user_provider_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_id text not null check (provider_id in ('openai','anthropic','google','deepseek','qwen','glm','hunyuan','doubao','ollama-cloud','openai-compatible')),
  encrypted_key text not null,  -- AES-256-GCM encrypted API key
  key_hint text,                -- e.g. "sk-...3fg7" for UI display
  base_url text,                -- optional override for OpenAI-compatible providers
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider_id)
);

alter table public.user_provider_keys enable row level security;

-- Users can only read/write their own keys
create policy "select_own_keys" on public.user_provider_keys for select using (user_id = auth.uid());
create policy "insert_own_keys" on public.user_provider_keys for insert with check (user_id = auth.uid());
create policy "update_own_keys" on public.user_provider_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete_own_keys" on public.user_provider_keys for delete using (user_id = auth.uid());
```

**Critical**: The `encrypted_key` column stores the AES-encrypted API key. The encryption key (`ENCRYPTION_KEY`) is a server-only env var. RLS ensures users can only access their own rows, but even if a user reads their own `encrypted_key` directly (via Supabase client), they cannot decrypt it without `ENCRYPTION_KEY` which is server-only.

**Key hint**: Store a non-sensitive prefix (e.g., `sk-...3fg7`) for UI display so the user can identify which key they configured.

---

### 6. Runtime Key Injection Flow

```
Client (UI)                        Server (Route Handler)              Database
   |                                      |                               |
   | 1. POST /api/keys/save              |                               |
   |   { providerId, apiKey }            |                               |
   | ----------------------------------> |                               |
   |                                      | 2. Test key (optional)        |
   |                                      |    createOpenAI({apiKey})     |
   |                                      |    -> models.list()           |
   |                                      |                               |
   |                                      | 3. Encrypt key with AES       |
   |                                      |    key = encrypt(apiKey)      |
   |                                      | ----------------------------> |
   |                                      |    INSERT user_provider_keys  |
   |                                      | <---------------------------- |
   |                                      |                               |
   | 4. { success, keyHint }             |                               |
   | <---------------------------------- |                               |
   |                                      |                               |
   | ...later: POST /api/grill/start     |                               |
   |   { scenario, draft, providerId }   |                               |
   | ----------------------------------> |                               |
   |                                      | 5. Auth user (Supabase)       |
   |                                      | 6. Read user's encrypted key  |
   |                                      | <---------------------------- |
   |                                      | 7. Decrypt key               |
   |                                      | 8. If user key exists:        |
   |                                      |    model = createOpenAI({     |
   |                                      |      apiKey: userKey          |
   |                                      |    })                         |
   |                                      |    Else: getModel(providerId) |
   |                                      |      (registry / env fallback) |
   |                                      | 9. generateObject({ model })  |
   | <---------------------------------- |                               |
```

---

### 7. Comparison: Desktop vs Web App Key Storage

| Aspect | Desktop (Cherry Studio, AionUi) | Web (Open WebUI) | Web (MindGrill / Next.js) |
|---|---|---|---|
| Key storage | Local SQLite / keychain, no encryption needed | Server DB (plaintext JSON blob, admin-only) | Server DB (AES encrypted, per-user RLS) |
| Who configures | Single user on their machine | Admin (global keys) | Each user (per-user keys) + admin defaults |
| Threat model | Local filesystem trust | Admin is trusted; DB is on same server | Multi-tenant; keys must be encrypted at rest |
| Key exposure risk | None (local only) | DB file access = key access | Encrypted; DB compromise alone is insufficient |
| Runtime model | Electron (persistent process) | Uvicorn (persistent process, in-memory cache) | Vercel serverless (stateless, DB per request) |

---

### 8. Next.js 14 App Router Specific Considerations

1. **Server Actions** (preferred for form submission): Can handle key encryption + DB write without creating a separate API route
2. **Route Handlers** (`app/api/*/route.ts`): Must handle key decryption + LLM call
3. **`NEXT_PUBLIC_` prefix**: MUST NOT be used for any key or encryption secret
4. **Edge Runtime**: Avoid for key management routes (need Node.js `crypto` module); use `export const runtime = "nodejs"`
5. **Vercel serverless**: No in-memory state between requests. The current `registry.ts` lazy cache (`_registry`) only works because env vars are stable across invocations. Per-user keys MUST be read from DB per request.
6. **Cookie-based auth**: Supabase SSR middleware already handles session cookies. `getServerSupabase()` in Route Handlers provides authenticated user context.

---

### 9. Masking and Display Patterns

When showing configured keys in the UI:

- **Masked display**: `sk-...3fg7` (show first 2-3 chars + last 4 chars)
- **Key count only**: Current approach (`keyCount: number` in health check)
- **Set/unset status**: `configured: boolean` (current approach)
- **Never echo back full key**: Even in admin UI, show masked form. If user needs to update, they replace the entire key.
- **On save**: Return only `keyHint` (masked), not the full key
- **On read**: API endpoint returns `{ configured: true, keyHint: "sk-...3fg7" }` at most

---

### 10. Connection Test Pattern

Both Open WebUI and the PRD require a "test connectivity" feature:

1. User enters key in form
2. Client calls `POST /api/keys/test` with `{ providerId, apiKey, baseUrl? }`
3. Server creates a temporary SDK provider instance with the provided key
4. Makes a lightweight API call (e.g., `models.list()` or a short completion)
5. Returns `{ success: boolean, error?: string, models?: string[] }`
6. Key is NOT stored yet -- test is stateless
7. If test passes, user confirms and client calls `POST /api/keys/save`

This two-step pattern prevents storing invalid keys.

---

## External References

- [Open WebUI config.py](https://github.com/open-webui/open-webui/blob/main/backend/open_webui/config.py) -- PersistentConfig class, API key storage as JSON blob
- [Open WebUI openai.py](https://github.com/open-webui/open-webui/blob/main/backend/open_webui/routers/openai.py) -- Key resolution by index, admin config update endpoint
- [Open WebUI oauth.py](https://github.com/open-webui/open-webui/blob/main/backend/open_webui/utils/oauth.py) -- Fernet encryption for OAuth secrets (NOT for LLM keys)
- [Open WebUI pyproject.toml](https://github.com/open-webui/open-webui/blob/main/pyproject.toml) -- `cryptography==46.0.5` dependency
- [Vercel AI SDK 5 docs](https://sdk.vercel.ai/docs) -- createProviderRegistry, per-request provider instances
- [Next.js 14 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) -- Server-only code, runtime selection
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) -- Per-user data isolation

## Related Specs

- `.trellis/spec/backend/ai-provider-guidelines.md` -- Current multi-provider architecture, key rotation, env var format
- `.trellis/tasks/05-05-provider-config-ui/prd.md` -- Task PRD with open questions on key storage and runtime

## Caveats / Not Found

- **Cherry Studio Web**: Could not find a web variant; Cherry Studio is Electron-only. Its key storage is local SQLite with no encryption, which does not apply to web apps.
- **Vercel AI Gateway**: Mentioned in code comments as a potential path but no concrete patterns found for per-user key management through the gateway.
- **Open WebUI per-user LLM keys**: Open WebUI does NOT support per-user LLM API keys. Only admin-configured global keys. The `ApiKey` model is for authenticating to Open WebUI itself, not LLM providers.
- **AES encryption in Vercel serverless**: The Node.js `crypto` module is available in Node.js runtime on Vercel, but not in Edge runtime. Must use `export const runtime = "nodejs"`.
- **Encryption key rotation**: If `ENCRYPTION_KEY` is changed, all stored encrypted keys become unreadable. Need a migration strategy or key versioning if this is a concern.