# LLM 供应商闭环: createProviderRegistry + Multi-Key Rotation

## Goal

升级 MindGrill 的多 LLM 供应商管理层，从手写 switch/case factory 迁移到 Vercel AI SDK 5 原生 `createProviderRegistry`，并增加同供应商多 API Key 自动轮转（参考 AionUi 的 90s blacklist 模式）。闭环当前"只有 2 个可用 key、fallback 仅跨供应商"的脆弱状态，确保评委 demo 期间不会因单 key 限流/宕机而崩溃。

## What I already know

* 当前可用 API key 仅 2 个：Ollama Cloud Pro (`OLLAMA_API_KEY`) + Google AI Studio (`GOOGLE_GENERATIVE_AI_API_KEY`)
* 现有 `factory.ts` 用 switch/case 手写 provider 实例化逻辑，3 类分支 (openai / anthropic / google native vs OpenAI-compatible default)
* 现有 `router.ts` 的 `withFallback` 是**跨供应商** sequential fallback (wrapLanguageModel middleware)，**不支持同供应商多 key rotation**
* AI SDK 5 (`ai@^5.0.0`) 已安装，提供 `createProviderRegistry` + `customProvider` 原生能力
* AionUi 的 Multi-Key Rotation 模式：逗号/换行分隔多 key → 随机 load balancing → 失败 key 加入 90s blacklist → 自动恢复
* Vercel AI Gateway 提供 `providerOptions.gateway.models` fallback chain，可一键接入但需 Vercel 账号
* 详见 [`research/multi-llm-provider-closure.md`](../05-03-ai-writing-grill/research/multi-llm-provider-closure.md)（在父任务 research 目录下）

## Requirements

1. **`createProviderRegistry` 升级**: 用 AI SDK 5 原生 `createProviderRegistry` 替换 `factory.ts` 的 switch/case，统一 `providerId:modelId` 字符串寻址
2. **`customProvider` 默认模型映射**: 用 `customProvider` 定义 `grill-default` / `grill-fast` 等逻辑别名，绑定推荐的 (provider, model) 对
3. **Multi-Key Rotation**: 同一 provider 支持逗号分隔多 API key；调用失败 (401/429/503) 的 key 加入内存 blacklist (默认 90s)，期间自动跳过该 key
4. **保留现有接口兼容**: `getModel()`, `withFallback()`, `getDefaultProvider()`, `getFallbackOrder()`, `resolveProvider()`, `getProviderHealth()` 等公开 API 签名不变，内部实现升级
5. **保留 provider-registry.ts metadata**: `PROVIDERS`, `ProviderMeta`, `PROVIDER_IDS` 等纯数据结构保持不变，供前端 UI 和 health check 使用
6. **health-check 适配**: `/api/health/providers` 返回值增加 `keyCount` 字段（多 key 时 > 1），前端 provider badge 展示 key 数量
7. **测试覆盖**: key rotation 逻辑需单元测试（blacklist、recovery、random selection）；registry 创建逻辑需单元测试

## User Stories

* 作为参赛者，我希望 demo 期间即使 Ollama Cloud Pro 限流，系统也能自动用 Google AI Studio 继续拷问，评委体验不中断
* 作为参赛者，我希望同一供应商有多个 key 时系统能自动轮转负载，避免单个 key 被限流
* 作为参赛者，我希望 PDF 文档能讲"架构支持 createProviderRegistry + 多 key rotation + AI Gateway 一键接入"，证明 AI 原生性
* 作为评委，我希望在 UI 看到 provider 配置状态（几个 key 可用、是否健康），而非只有一个"已配置/未配置"二态

## Acceptance Criteria

* [ ] `factory.ts` 不再包含 switch/case，改为 `createProviderRegistry` 统一创建
* [ ] `registry.languageModel('ollama-cloud:qwen3:235b')` 风格的字符串寻址可用
* [ ] 同一 env var 支持逗号分隔多 key，系统自动轮转
* [ ] 401/429/503 失败的 key 在 90s 内被跳过，90s 后自动恢复
* [ ] `withFallback` (跨供应商) 和 Multi-Key Rotation (同供应商) 互补工作
* [ ] 公开 API 签名 (`getModel`, `withFallback`, `getDefaultProvider` 等) 不变，已有调用方无需修改
* [ ] `/api/health/providers` 返回 `keyCount` 字段
* [ ] 新增 rotation 逻辑的单元测试通过
* [ ] 现有 4 个测试文件 (43 tests) 仍然通过
* [ ] `next build` + `pnpm typecheck` 通过

## Definition of Done (team quality bar)

* 新增 Multi-Key Rotation 单元测试
* Registry 创建逻辑单元测试
* Lint / typecheck / build 绿
* API 接口向后兼容，已有路由和组件无需修改

## Technical Approach

### 核心变更

用 `createProviderRegistry` 替换 `factory.ts` 的 switch/case。Registry 在服务端启动时按 env 动态构建——有 key 的 provider 注册到 registry，没 key 的跳过。`customProvider` 封装 registry 并提供逻辑别名 (`grill-default`, `grill-fast`)。

Multi-Key Rotation 在 `factory.ts` 层实现：解析 env var 中逗号分隔的多 key → 随机选择一个 → 失败时加入 blacklist → 下次自动跳过。Blacklist 用内存 `Map<string, number>` (key prefix → blacklistUntil timestamp)，零外部依赖。

`withFallback` (router.ts) 保持跨供应商 fallback 逻辑不变，但内部调 `getModel` 时会自动受益于 Multi-Key Rotation（同供应商内先轮转 key，所有 key 失败后才触发跨供应商 fallback）。

### Modules to build/modify

* **`src/lib/ai/factory.ts`** — 重写: createProviderRegistry 替换 switch/case + Multi-Key Rotation; tests: yes
* **`src/lib/ai/key-rotation.ts`** — 新增: Multi-Key 解析、blacklist 管理、key 选择; tests: yes
* **`src/lib/ai/registry.ts`** — 新增: createProviderRegistry + customProvider 构建; tests: yes
* **`src/lib/ai/health-check.ts`** — 修改: 增加 keyCount 字段; tests: yes (现有)
* **`src/lib/ai/index.ts`** — 修改: re-export 新模块; tests: no
* **`src/lib/ai/router.ts`** — 微调: 适配 factory 内部变更; tests: yes (现有)

### Architectural decisions

* **Registry 构建时机**: 服务端启动时按 env 动态构建 (而非每次调用时创建)，避免重复初始化 SDK provider 实例
* **Multi-Key 格式**: 逗号分隔 (同 AionUi)，如 `sk-abc,sk-def,sk-ghi`；兼容单 key（不包含逗号时走原逻辑）
* **Blacklist 存储**: 内存 Map (服务器端)，进程重启清空。不做持久化——比赛 demo 期间重启即可恢复，不需要 Redis/Supabase
* **Blacklist 时长**: 90s (同 AionUi)，可配置 `KEY_BLACKLIST_DURATION_MS` env var
* **Key 选择策略**: 随机 (non-blacklisted keys 中随机选一个)，避免总是打第一个 key

## Decision (ADR-lite)

**Context**: 当前 factory.ts 手写 switch/case 维护成本高，且不支持同供应商多 key rotation。AI SDK 5 提供原生 `createProviderRegistry` 方案，减少自定义代码并原生支持未来 AI Gateway 接入。

**Decision**: 采用 `createProviderRegistry` + `customProvider` + 内存 Blacklist Multi-Key Rotation 方案。

**Consequences**:
- ✅ 代码量减少 (switch/case + 手写 middleware → 声明式 registry)
- ✅ 原生支持 `provider:model` 字符串寻址
- ✅ Multi-Key Rotation 提升 demo 稳定性
- ✅ 未来 AI Gateway 接入零代码改动 (加一个 `gateway` 到 registry 即可)
- ⚠️ `factory.ts` 大幅重写，需仔细保证接口兼容
- ⚠️ Multi-Key Rotation 是内存状态，多实例部署时 blacklist 不共享（比赛单实例 demo 无此问题）

## Out of Scope

* 模型自动发现 (`/models` API) — 留给后续任务
* Vercel AI Gateway 接入 — 可在 PDF 讲，demo 不需要
* AionUi 的 Google OAuth Login — Web App 场景用 API key 即可
* Blacklist 持久化 (Redis/Supabase) — 比赛 demo 不需要
* 运行时动态添加/删除 provider (不改 env、不重启) — 超出 scope
* 前端 provider 设置 UI 大改 — 仅增加 keyCount 显示

## Research References

* [`../05-03-ai-writing-grill/research/multi-llm-provider-closure.md`](../05-03-ai-writing-grill/research/multi-llm-provider-closure.md) — AionUi 分析 + 主流方案对比 + 4 步闭环建议

## Technical Notes

* AI SDK 版本: `ai@^5.0.0`, `@ai-sdk/openai@^2.0.0`, `@ai-sdk/google@^2.0.0`, `@ai-sdk/anthropic@^2.0.0`
* `createProviderRegistry` import from `'ai'`, `customProvider` import from `'ai'`
* 现有测试文件: `src/lib/ai/__tests__/factory.test.ts` (22 tests), `src/lib/ai/__tests__/mcp.test.ts` (7 tests)
* 调用方: `src/app/api/grill/start/route.ts`, `src/app/api/grill/answer/route.ts`, `src/hooks/use-provider-health.ts`