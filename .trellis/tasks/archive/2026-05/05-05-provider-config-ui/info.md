# Technical Design — Provider Config UI

## Resolved by grill

### D1.1: User key injection — `getModelWithUserKey()` (not `getModel` override)

**Context**: The PRD proposed `getModel(providerId, modelId, { apiKeyOverride })`. But `getModel` feeds the singleton registry + fallback router + blacklist — infecting all of them with a parameter used only 1% of the time.

**Decision**: Add a new standalone function `getModelWithUserKey(providerId, modelId, userApiKey)` that creates a fresh SDK provider instance on-the-fly (same logic as `createSdkProvider` but with the user's key). `getModel()` stays unchanged for the env-key path. Grill API routes call `getModelWithUserKey` when a user key exists, fall back to `getModel` otherwise.

**Why**: Minimal blast radius — no changes to registry, fallback router, or blacklist.

**How to apply**:
- New file `src/lib/ai/user-key.ts` with `getModelWithUserKey()`
- Reuse `getProviderMeta()`, `defaultModelFor()` from provider-registry
- Create SDK provider instance (OpenAI / Anthropic / Google) with user key
- Grill routes: `const model = userKey ? getModelWithUserKey(pid, mid, userKey) : withFallback(pid, mid, order)`

### D1.2: User keys and blacklist — no interaction

**Context**: The in-memory blacklist (`key-rotation.ts`) tracks failed env keys. User keys are per-request and stored encrypted in Supabase.

**Decision**: User keys bypass the blacklist entirely. `getModelWithUserKey` creates a fresh provider per request — no blacklist involvement. If a user key fails, the error propagates to the client (visible in the test-connection response); no server-side blacklisting.

**Why**: Blacklist is in-memory on a single server instance; in serverless (Vercel), each invocation is isolated anyway. User keys are ephemeral per-request — blacklisting makes no sense.

### D1.3: Multi-key storage — one row per key (not comma-separated)

**Context**: PRD implied comma-separated keys in a single `encrypted_key` column. But comma-separated makes individual key management (hint display, single-key delete, per-key test) awkward — you'd have to decrypt-all → parse → remove → re-encrypt → write.

**Decision**: Each `user_provider_keys` row stores one encrypted key with its own `key_hint`. User adds 3 OpenAI keys = 3 rows. RLS naturally enforces per-user access. DELETE removes one row. keyHint displays one per row.

**Why**: Cleaner RLS, simpler delete, natural hint display.

**How to apply**:
- Schema: `(id, user_id, provider_id, encrypted_key, key_hint, base_url, created_at, updated_at)` — no multi-key column
- UI: show list of key hints per provider, each with a delete button
- Save: POST `/api/keys/save` accepts one key at a time

### D1.4: Settings page layout — collapsible card per provider

**Decision**: Each provider is a collapsible card (default collapsed). Shows: name, blurb, status badge (configured/unconfigured), key count, key hints. Expanded: input + test button + save button + model list. Standard settings-page pattern for 10 items.

**Why**: 10 providers on one page is too much for a flat list. Collapsed default keeps the page scannable; expand-on-demand for the provider you care about.

### D1.5: Model discovery — best-effort, not all-or-nothing

**Decision**: After successful connection test, try to fetch `/models` (or provider-equivalent). If it works, return model list. If it fails (provider doesn't support it, network issue), return empty array — not an error.

**Why**: Not all providers expose a `/models` endpoint reliably. The test-connection response should still report success even if model discovery fails.

### D1.6: Save flow — test-first recommended, direct save allowed

**Decision**: UI shows two buttons: "测试连通性" (primary) and "直接保存" (secondary/ghost). Test returns { success, models?, error? }. On test success, auto-populate available models and enable save. User can also skip testing and save directly.

**Why**: Strict test-then-save blocks power users who know their keys work. But test-first should be the obvious path.

## TBD

(None — all decision branches resolved)