# 辩思 MindGrill

> **AI 不帮你写，帮你想清楚。**
>
> PCG 校园 AI 创意大赛 2026 — 开放赛道参赛作品。

辩思（MindGrill）是一款**反工具化**的 AI 写作教练。它不替你写论文 / 简历 / 公众号，而是用「决策树拷问 + 推荐答案」的机制让你**先想清楚再下笔**。

灵感来自 [mattpocock/grill-me](https://github.com/mattpocock/skills)（GitHub 53.4k ⭐ 验证的拷问方法论），首次将其从「程序员代码设计」迁移到「中文写作思维教练」领域。

---

## ✨ 核心特性（Pass 2 — 当前版本）

| 模块 | 说明 |
|------|------|
| 决策树拷问引擎 | 纯 TS 4 态状态机（`INTAKE → GRILLING → THINKING → COMPLETE`），5–8 轮收敛 |
| 一次一问 + 推荐答案 | 每轮 AI 输出 `{question, recommended_answer, alternatives[2], can_skip, is_terminal}` |
| 3 个场景包 | 论文开题（学术导师）/ 简历投递（HR）/ 公众号（编辑） |
| 多 LLM 供应商抽象 | 10 家 provider 工厂（OpenAI / Anthropic / Google / 豆包 / DeepSeek / Qwen / GLM / 混元 / Ollama Cloud / 自定义 OpenAI 兼容） |
| 自动 fallback 路由 | 主 provider 限流 / 5xx → 顺序切换到下一个 healthy provider |
| 思维进化树 | `@xyflow/react` BFS 布局；按 RESOLVED 时间顺序回放节点澄清过程 |
| 改稿行级 diff | `diff` 库 word-level diff，添加 / 删除 / 不变三色高亮 |
| 分享卡片 | 1080² 社交方图，`html-to-image` 离屏导出 PNG，可直接发朋友圈 |
| 软登录 | 默认匿名（Zustand + localStorage），可选 Supabase Magic Link / Google OAuth |
| 我的拷问历史 | 登录后查看跨设备同步的历史，恢复进行中或已完成的会话 |
| MCP 工具层（架构就绪） | `src/lib/ai/mcp/` 接受 `TAVILY_API_KEY` + `MCP_SERVERS`；实际 tool 调用待 Vercel AI SDK v6 GA |

---

## 🏗️ 架构

```
┌────────────────────────────────────────────────────────────┐
│  Next.js 14 App Router — Web App                           │
│  src/app/page.tsx        landing + 3 SceneCard             │
│  src/app/grill/[scenario]/page.tsx   主拷问流程            │
│  src/app/api/grill/{start,answer}    API routes            │
│  src/app/api/health/providers        健康检查              │
└──────────────────┬─────────────────────────────────────────┘
                   │
        ┌──────────▼────────────┐
        │ src/lib/engine/       │  ← 纯 TS 决策树状态机
        │ src/lib/engine/scenarios/  3 场景 prompt 模板  │
        │ src/lib/schemas/grill.ts   Zod 契约            │
        └──────────┬─────────────┘
                   │
        ┌──────────▼────────────┐
        │ src/lib/ai/           │  ← Provider Registry
        │  - provider-registry.ts   10 个 ProviderMeta   │
        │  - factory.ts             createOpenAI/Anthropic/Google │
        │  - health-check.ts        env 健康检查         │
        │  - router.ts              wrapLanguageModel + fallback │
        │  - defaults.ts            默认/优先顺序        │
        └──────────┬─────────────┘
                   │
              [ Vercel AI SDK 5 ]
              streamText / generateObject
                   │
        ┌──────────┴───────────────────────────────────┐
        │  Ollama Cloud Pro / Google AI Studio /       │
        │  OpenAI / Anthropic / DeepSeek / 通义 /      │
        │  GLM / 混元 / 豆包 / 自定义 OpenAI 兼容       │
        └──────────────────────────────────────────────┘
```

平台无关层（`lib/ai`、`lib/engine`、`lib/schemas`、`lib/errors`、`lib/logger`）不依赖任何 Next.js / React runtime，可被未来的 React Native / Expo 端复用。

---

## 🚀 本地开发

```bash
pnpm install
cp .env.local.example .env.local      # 填入至少一个 *_API_KEY
pnpm dev                              # http://localhost:3000
```

### 质量门禁

```bash
pnpm lint        # ESLint (eslint-config-next)
pnpm typecheck   # tsc --noEmit (strict mode)
pnpm test        # vitest run
```

---

## 🔑 环境变量

详见 [`.env.local.example`](./.env.local.example)。最小可运行配置（任选其一即可）：

| 推荐 | 变量 | 说明 |
|------|------|------|
| ⭐ 主选 | `OLLAMA_API_KEY` | Ollama Cloud Pro，OpenAI 兼容，跑前沿开源模型 |
| 推荐 | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5 Flash / Pro，多模态 + 免费额度大 |
| 推荐 | `OPENAI_API_KEY` | GPT-4o-mini / GPT-4o，fallback 稳定首选 |
| 备选 | `ANTHROPIC_API_KEY` | Claude 3.5 Sonnet / Haiku |
| 国内 | `DEEPSEEK_API_KEY` / `QWEN_API_KEY` / `GLM_API_KEY` / `HUNYUAN_API_KEY` / `DOUBAO_API_KEY` | OpenAI 兼容，中文场景适配 |
| 高阶 | `OPENAI_COMPATIBLE_BASE_URL` + `OPENAI_COMPATIBLE_API_KEY` | 自定义网关（NewAPI / Vercel AI Gateway / 私有部署） |

---

## 🎯 比赛背景

* **比赛**: 腾讯 PCG 校园 AI 产品创意大赛 2026（首届，截稿 2026-05-06 23:59）
* **赛道**: 开放赛道（"AI 搞定校园生活"）
* **差异化定位**: 反工具化——市面上所有"AI 帮你写"工具（笔灵 / WPS AI / Notion AI / Sudowrite）都聚焦"出稿效率"；辩思相反，专攻"想清楚"的前置环节。
* **市场验证**: [mattpocock/grill-me](https://github.com/mattpocock/skills) 在程序员社群获得 **53.4k stars / 4.5k forks**——拷问方法论已被验证；辩思首次将其本地化到中文大学生写作场景。

---

## 📦 Pass 2（当前版本）

* ✅ 决策树引擎（纯 TS，单元测覆盖）
* ✅ 3 场景 prompt 模板（论文 / 简历 / 公众号）
* ✅ 10 家 provider 抽象 + 自动 fallback 路由
* ✅ 健康检查 API（`/api/health/providers`）
* ✅ 端到端流程：粘草稿 → 5–8 轮拷问 → AI 改稿
* ✅ Zustand + localStorage 匿名持久化
* ✅ React Flow 思维进化树（带回放）
* ✅ Word-level diff 高亮（`diff`）
* ✅ 1080² 社交分享卡片导出（`html-to-image`）
* ✅ Supabase Auth + 我的拷问历史（Magic Link + Google OAuth）
* ✅ RLS 保护 (`profiles` + `grill_sessions`，详见 `supabase/migrations/0001_init.sql`)
* ✅ MCP 架构层（env-driven server registry，待 Vercel AI SDK v6 GA 后启用 tool 调用）
* ✅ Vitest 单元测覆盖：engine / scenarios / provider factory / MCP config (43 tests)

## 📦 Pass 3（路线图）

* ⏳ MCP tool 真正接入（等 `@ai-sdk/mcp` GA）
* ⏳ 决策树导出 PDF + 多人协作模式（PCG 业务嵌入故事）
* ⏳ Cross-platform Expo 移动端（`lib/` 已是平台无关层）

---

## 🛠️ Supabase 配置（可选）

匿名流程在没有 Supabase 时完全可用。要启用登录 + 历史，请：

1. 在 [supabase.com](https://supabase.com) 新建项目，复制 URL + anon key 写入 `.env.local`：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
2. 在 SQL Editor 运行 `supabase/migrations/0001_init.sql`（包含 `profiles` + `grill_sessions` + RLS + 自动 profile trigger）。
3. 启用想要的 Auth providers：
   - Magic Link（邮箱）—— 默认开启
   - Google OAuth —— 在 Auth Settings 配置 Google client
4. 重启 `pnpm dev`，访问 `/auth/sign-in`。

`/api/grill/answer` 在 user 已登录时会自动 upsert 当前会话到 `grill_sessions`，未登录时跳过；既不会丢匿名体验，也不会把匿名数据误写到数据库。

---

## 🔌 MCP 工具层（可选）

辩思的 LLM 调用层留出了 MCP（Model Context Protocol）接入点：

* **架构**: `src/lib/ai/mcp/index.ts` 维护一份 `McpServerConfig[]`；`getMcpTools()` 在每轮拷问前被调用以注入额外工具。
* **当前状态**: 默认实现返回 `{}`（no-op），因为 Vercel AI SDK 5.x 还未稳定提供 `createMCPClient`，而 v6（`ai-v6` 标签）有 breaking changes。设置 `TAVILY_API_KEY` 或 `MCP_SERVERS` 不会破坏任何功能；启用真实 tool 调用只需替换 `getMcpTools()` 的实现（约 30 行）。
* **未来**: `pnpm add ai@ai-v6 @ai-sdk/mcp` → 在 `getMcpTools()` 内 `await Promise.all(servers.map(connectClient))` 并合并 tool maps。

---

## 📁 目录速览

```
src/
├── app/
│   ├── page.tsx                    landing (含 UserHeader)
│   ├── grill/[scenario]/page.tsx   拷问主流程
│   ├── api/grill/start/route.ts    POST 起会话 (+ Supabase upsert)
│   ├── api/grill/answer/route.ts   POST 提答案 (+ Supabase upsert on COMPLETE)
│   ├── api/health/providers/route.ts  GET provider 健康
│   ├── auth/sign-in/page.tsx       Magic Link + Google
│   ├── auth/callback/route.ts      OAuth code exchange
│   ├── auth/sign-out/route.ts      sign out
│   ├── history/page.tsx            我的拷问历史 列表
│   └── history/[id]/page.tsx       恢复历史会话 → /grill/[scenario]
├── components/
│   ├── scene-card.tsx              首页场景卡
│   ├── draft-intake.tsx            草稿粘贴
│   ├── question-renderer.tsx       单轮问题 + 推荐答案 + 备选
│   ├── streak-loader.tsx           AI 思考态橙色光带
│   ├── progress-indicator.tsx      已问 N / 目标 5–8 轮
│   ├── revision-summary.tsx        diff + 思维进化树 + 分享
│   ├── revision-diff.tsx           word-level diff
│   ├── thinking-tree-viz.tsx       React Flow + 回放
│   ├── share-card.tsx              1080² 离屏 PNG 导出
│   └── user-header.tsx             登录态徽章
├── lib/
│   ├── ai/                          多供应商抽象 (+ mcp/ 接入点)
│   ├── auth/get-user.ts             服务端 getServerUser
│   ├── engine/                      决策树状态机
│   ├── engine/scenarios/            3 场景 prompt
│   ├── schemas/grill.ts             Zod 契约
│   ├── supabase/                    client / server / middleware / sessions / env
│   ├── errors.ts                    AppError + errorResponse
│   └── logger.ts                    JSON-line logger
├── middleware.ts                    Supabase session refresh on every request
├── hooks/use-provider-health.ts
└── stores/grill-store.ts            Zustand + persist
supabase/migrations/0001_init.sql    profiles + grill_sessions + RLS
```

---

## License

Private — for the PCG contest entry only.
