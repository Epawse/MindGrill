# 供应商配置 UI: API Key 管理 + 连通性测试 + 模型发现

## Goal

在 MindGrill Web App 中加入 LLM 供应商配置界面，让用户（评委/注册用户）能在 UI 中配置 API Key、查看供应商状态、测试连通性、发现可用模型。采用混合模式：env 默认 key 免登体验 + 登录用户自配 key（加密存储 Supabase）。

## What I already know

* 已有 `createProviderRegistry` + Multi-Key Rotation 架构（key-rotation.ts, registry.ts）
* 已有 `/api/health/providers` 返回供应商状态（configured, keyCount, missingEnv）
* 已有 Supabase Auth (Magic Link + Google OAuth) + RLS
* 现有 key 只通过 `.env.local` 配置，改了需重启
* 调研详见 [`research/web-api-key-storage.md`](research/web-api-key-storage.md)

## Requirements

1. **供应商配置页面**: 新增 `/settings` 路由，展示 10 个供应商的状态（已配置/未配置/key 数量/健康状态）
2. **API Key 管理**: 登录用户可输入/修改 API Key，每次添加一个 key（可添加多个）；key 存入 Supabase `user_provider_keys` 表（每行一个），AES-256-GCM 加密
3. **混合模式**: 评委免登时用 env 默认 key；登录用户自配 key 优先于 env key
4. **连通性测试**: 用户输入 key 后可点击"测试连通性"，服务端用 `getModelWithUserKey()` 创建临时实例验证，返回成功/失败+模型列表（best-effort：模型发现失败不阻塞连通性成功）
5. **模型自动发现**: 连通性测试成功后调用 provider 的 `/models` endpoint 拉取可用模型列表，best-effort（不支持 /models 的 provider 返回空列表）
6. **Key 安全**: key 不暴露到客户端 bundle；API 只返回 masked keyHint (`sk-...3fg7`)；加密/解密仅在 server-side
7. **运行时生效**: 用户保存 key 后立即生效（不重启 server），grill API 调用时优先使用用户 key
8. **免登兼容**: 未登录用户仍可正常使用（走 env 默认 key），配置页面提示"登录后可自定义供应商"

## User Stories

* 作为评委，我希望打开 demo 链接就能直接使用（env key 免登体验），不需要配置任何 key
* 作为注册用户，我希望在设置页面配置自己的 API key，系统加密保存
* 作为用户，我希望测试 key 是否有效后再保存，避免存无效 key
* 作为用户，我希望看到每个供应商有哪些模型可用（模型发现）
* 作为用户，我希望保存 key 后立即生效，不需要重启任何东西

## Acceptance Criteria

* [ ] `/settings` 页面展示 10 个供应商的可折叠卡片（名称、blurb、configured、keyCount、keyHint 列表）
* [ ] 登录用户可输入 API Key 并保存到 Supabase（AES-256-GCM 加密，每行一个 key）
* [ ] 未登录用户看到配置页面但输入框提示"登录后可自定义"
* [ ] 连通性测试按钮：发送测试请求验证 key 有效性，成功时返回可用模型列表（best-effort）
* [ ] 保存按钮：支持"测试后保存"和"直接保存"两种流程
* [ ] 保存的 key 在 `/api/grill/*` 调用中通过 `getModelWithUserKey()` 优先于 env 默认 key
* [ ] API 永不返回完整 key，只返回 keyHint
* [ ] 加密 key 的 `ENCRYPTION_KEY` 仅存于 server-side env
* [ ] `pnpm typecheck` + `pnpm test` + `next build` 通过

## Definition of Done

* 新增 Supabase migration（user_provider_keys 表 + RLS）
* 新增加密/解密工具函数 + 单元测试
* 新增 `src/lib/ai/user-key.ts`（getModelWithUserKey 函数）
* 新增 API 路由（GET /api/keys, POST /api/keys/save, POST /api/keys/test, GET /api/keys/models, DELETE /api/keys/:id）
* 新增 `/settings` 页面 + 可折叠卡片组件
* 修改 `/api/grill/*` 路由支持用户 key 优先
* 所有测试通过

## Technical Approach

### Key 存储架构 (混合模式)

```
优先级: 用户 key (Supabase AES加密) → env 默认 key

1. 免登用户 → withFallback(providerId) → registry (env key)
2. 登录用户 → getModelWithUserKey(providerId, modelId, userKey) → 有用户 key 则用用户 key → 否则 fallback env key
```

### 加密方案

* 算法: AES-256-GCM
* 密钥: `ENCRYPTION_KEY` env var (32 bytes)
* IV: 每次加密随机生成，与密文一起存储
* 存储: `{iv}:{ciphertext}` 格式存入 `encrypted_key` 列

### Supabase Schema

```sql
user_provider_keys (id, user_id, provider_id, encrypted_key, key_hint, base_url, created_at, updated_at)
-- 每行一个 key，不是逗号分隔；用户添加 3 个 OpenAI key = 3 行
-- RLS: 用户只能读写自己的 key
```

### API 路由

| Method | Path | 功能 |
|--------|------|------|
| GET | `/api/keys` | 获取当前用户的所有 key（masked，返回 keyHint 列表） |
| POST | `/api/keys/save` | 保存一个 key（加密后存储，一次一行） |
| POST | `/api/keys/test` | 测试 key 连通性（不存储），成功时返回可用模型列表 |
| GET | `/api/keys/models?providerId=x` | 获取已保存 key 的可用模型列表（best-effort） |
| DELETE | `/api/keys/:id` | 删除指定 key 行（按 id，不是按 provider） |

### 运行时 key 注入

**不在 `getModel()` 上加参数**。新增 `getModelWithUserKey(providerId, modelId, userApiKey)` 函数（`src/lib/ai/user-key.ts`），按需创建临时 SDK provider 实例。用户 key 不走注册表、不触黑名单。

```ts
// /api/grill/start/route.ts
const userKey = await getUserProviderKey(userId, providerId);
const model = userKey
  ? getModelWithUserKey(providerId, modelId, userKey)
  : withFallback(providerId, modelId, getFallbackOrder(providerId));
```

### 连通性测试 + 模型发现

测试：创建临时 provider 实例 → 调 `provider.models.list()` 或短 completion → 返回 `{ success, models?, error? }`
模型发现：复用测试成功的 provider 实例，调 `/models` endpoint → 返回模型 ID 列表

## Decision (ADR-lite)

**Context**: Web App 没有"本地安全存储"，API key 必须在 server-side 管理。AionUi/Cherry Studio 是桌面 App 直接存本地，不适合 Web 场景。

**Decision**: 混合模式 — env 默认 key 免登体验 + 登录用户自配 key 加密存 Supabase。采用 AES-256-GCM 加密，keyHint masked 展示，两步保存（先测试后保存）。

**Consequences**:
- ✅ 评委免登即可体验（env key）
- ✅ 注册用户可自配 key（个性化 + 多 key）
- ✅ 安全：key 不暴露到客户端，AES 加密存储
- ⚠️ 需新增 DB migration + 加密工具层
- ⚠️ Vercel serverless 每次请求需读 DB 解密（无内存缓存）
- ⚠️ ENCRYPTION_KEY 丢失 = 所有已存 key 不可恢复

## Out of Scope

* 管理员全局 key 管理 UI（admin 配置 env key 仍需手动改 .env.local）
* BYOK (Bring Your Own Key) 对话界面（只做设置页面，不做对话时切换）
* Key 轮换/过期策略
* 多供应商并发测试
* 自定义 provider 添加 UI（`openai-compatible` 的 baseURL 配置）

## Research References

* [`research/web-api-key-storage.md`](research/web-api-key-storage.md) — Open WebUI 架构分析 + Supabase 加密存储方案 + 连通性测试模式

## Technical Notes

* 现有加密相关: Node.js `crypto` 模块, `export const runtime = "nodejs"` 必须声明
* 现有 Supabase client: `src/lib/supabase/server.ts` (createClient)
* 现有认证: `src/lib/auth/get-user.ts`
* 现有 key-rotation: `src/lib/ai/key-rotation.ts` (parseApiKeys, selectKey)
* 现有 factory: `src/lib/ai/factory.ts` (getModel, 不修改) → 新增 `src/lib/ai/user-key.ts` (getModelWithUserKey)
* Supabase migration 目录: `supabase/migrations/`