# 既有项目可复用模块清单（2026-05-03）

> 本研究汇总用户既有的 2 个项目（memexflow / tiktok_hackathon）中可借鉴 / 直接复用到 PCG 比赛 "AI Reverse Writing Coach" 项目的代码与架构模式。

---

## 项目 1: memexflow（Tauri 桌面 App）

**路径**: `/Users/haor/Learning/1_Projects/memexflow/`

### 整体定位
- **形态**: Tauri 2 桌面 App（macOS-first）+ React 19 + TypeScript
- **业务**: 个人知识库 + AI 提取记忆 + 主动召回
- **状态**: 4 个 Phase 全部完成（私有未开源）

### 技术栈
| 层 | 技术 |
|---|------|
| 前端 | Tauri 2, React 19, TypeScript, Tailwind CSS v4 |
| 同步 | PowerSync（Postgres ↔ SQLite 双向）|
| 后端 | **Supabase（Postgres + pgvector + Auth + Storage + Realtime）** |
| AI Worker | Python + Gemini 3 Flash + sentence-transformers (all-MiniLM-L6-v2) |
| 桌面 | Tauri 2 (Rust), macOS-first |

### 对 PCG 项目的借鉴点

| 模块 | 是否复用 | 借鉴方式 |
|------|---------|---------|
| Tauri 桌面 | ❌ | PCG 是 Web App，不需要 |
| **Supabase 集成** | ✅ **可直接复用** | `@supabase/supabase-js` 客户端 + Auth + Postgres |
| PowerSync | ❌ | PCG 不需要离线同步 |
| Python AI Worker | ❌ | PCG 用 Next.js 全栈，AI 调用走 API Route |
| **Zustand 状态** | ✅ **可直接复用** | 与本项目状态管理一致 |
| **i18next** | ⚠️ 备用 | PCG 暂仅中文，但模板可留 |
| **TanStack Query** | ✅ 可借鉴 | API 缓存与 mutation 模式 |
| **Sonner toast** | ✅ 可直接复用 | 通知 UI |
| **Zod schema** | ✅ **必用** | LLM 结构化输出验证 |

### Supabase 集成模式（关键复用）
- 用户系统：Supabase Auth（邮箱/OAuth）
- 数据库：Postgres + RLS
- pgvector：可选（PCG 项目暂不需要语义搜索）
- 这部分用户已熟练，**0.5 天可复用搭建**

---

## 项目 2: tiktok_hackathon（追忆 Zhuīyì，Next.js Web App）

**路径**: `/Users/haor/Learning/1_Projects/tiktok_hackathon/`

### 整体定位
- **形态**: Next.js 14（App Router）Web App
- **业务**: AI 驱动的照片编年史，上传照片→AI 分析→多风格叙事
- **AI**: Gemini 3 Flash（通过 **Ollama Cloud Pro** 接入）

### 技术栈
| 层 | 技术 |
|---|------|
| 框架 | Next.js 14（App Router）|
| AI | **OpenAI npm 包** + baseURL 指向 Ollama Cloud → Gemini 3 Flash |
| 状态 | **Zustand + localStorage 持久化** |
| 数据库 | **Supabase**（@supabase/ssr + supabase-js）|
| 动画 | Framer Motion |
| UI | Tailwind CSS + lucide-react + CSS-in-JS 主题 |
| 路由 | Hash-based SPA |
| 工具 | `exifr` (EXIF), `heic2any` (HEIC→JPEG), `@amap/amap-jsapi-loader` |

### 对 PCG 项目的借鉴点（高度匹配 ⭐⭐⭐⭐⭐）

| 模块 | 是否复用 | 借鉴方式 |
|------|---------|---------|
| **Next.js 14 App Router** | ✅ **直接复用脚手架** | `src/app/` 路由 + `src/app/api/` API Route |
| **OpenAI npm + Ollama Cloud baseURL** | ✅ **核心模式直接复用** | 见下文 client.ts 模式 |
| **流式 + JSON 模式** | ✅ **直接复用** | `response_format: { type: 'json_object' }` |
| **Prompt 模板函数** | ✅ **直接复用模式** | `buildXxxPrompt(...): string` |
| **Zustand + localStorage** | ✅ 持久化方案备选 | 评委 demo 不登录场景 |
| **Supabase** | ✅ 与 memexflow 一致 | 用户登录 + 拷问历史 |
| **lib/logger.ts** | ✅ 可直接复用 | 标签化日志 |
| **API Route 错误处理** | ✅ 模式复用 | try/catch + Response.json status |
| **middleware.ts** | ✅ 可借鉴 | Auth 中间件 |
| **Framer Motion** | ✅ 必用 | 决策树动画 + 思维进化树 |
| **Hash-based SPA** | ❌ | 我们用标准 Next.js Router |
| **EXIF/HEIC** | ❌ | 不涉及照片 |

### 关键代码片段：可直接复用的 LLM Client 模式

**`src/lib/ai/client.ts`**（tiktok_hackathon 原文）:
```typescript
import OpenAI from 'openai'

const ollamaClient = new OpenAI({
  apiKey: process.env.OLLAMA_API_KEY || '',
  baseURL: process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1',
})

export { ollamaClient }
```

**`src/app/api/analyze/route.ts`**（tiktok_hackathon 流式 + JSON 调用模式，可直接借鉴）:
```typescript
const response = await ollamaClient.chat.completions.create({
  model: 'gemini-3-flash-preview',
  messages: [{ role: 'user', content: [...] }],
  response_format: { type: 'json_object' },
  temperature: 0.3,
})
let content = response.choices[0]?.message?.content || ''
content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
const parsed = JSON.parse(content)
```

> **注意**：tiktok 用的是非流式 + JSON 一次性返回。本项目决策树拷问需要"流式 + 结构化"——可以从这个模式升级为 Vercel AI SDK `generateObject` / `streamText`。

### 关键代码片段：Prompt 模板函数模式
**`src/lib/ai/prompts.ts`**（值得借鉴的 prompt 函数式风格）:
```typescript
export function buildAnalyzePrompt(exif: PhotoExif | null): string {
  const locationHint = ... // 上下文构建
  return `你是一个照片分析专家。
${locationHint}
${timeHint}

请以JSON格式返回，不要包含任何其他文字：
{
  "scene": "...",
  "mood": [...],
  ...
}`
}
```

**借鉴**：本项目 5 个场景包（论文/简历/公众号）每个写一个 `buildXxxPrompt()` 函数，输入用户草稿 + 当前决策树状态，输出 prompt 字符串。

### 项目结构（推荐套用）
```
src/
  app/
    api/
      grill/route.ts        # 主拷问 API（流式 + structured）
      auth/[...]            # Supabase Auth 路由
    (auth)/...              # 登录/注册页
    coach/page.tsx          # 主体验页
    history/page.tsx        # 拷问历史
  components/
    DraftIntake.tsx
    QuestionCard.tsx
    ThinkingTree.tsx        # React Flow
    RevisionDiff.tsx
  lib/
    ai/
      client.ts             # 多 provider 工厂（升级 tiktok 单 client）
      router.ts             # 选择 + fallback
      providers.ts
      prompts/
        论文.ts
        简历.ts
        公众号.ts
      schemas.ts            # Zod 决策树 schema
    supabase/
      client.ts             # 复用 memexflow + tiktok 模式
      server.ts
    logger.ts               # 直接复用 tiktok
  store/
    useGrillStore.ts        # Zustand
    useAuthStore.ts
  middleware.ts             # Auth 中间件
  types/
    index.ts
```

---

## 综合复用比例估算

| 维度 | 借鉴 | 直接复用 | 重新写 | 合计 |
|------|------|---------|-------|------|
| Next.js 脚手架 | - | 80% | 20% | tiktok 模板 |
| LLM Client 层 | 100% | 50%（升级到多 provider）| 50%（router/registry）| tiktok + 调研 |
| Supabase 集成 | - | 90% | 10% | memexflow + tiktok |
| 状态管理 | - | 80% | 20% | tiktok zustand 模式 |
| UI 组件 | - | 30%（lucide + sonner）| 70%（决策树新组件）| 自制为主 |
| Prompt 模板 | 100% | - | 100% 内容 | 模式复用 |
| 决策树可视化 | - | - | 100% | React Flow 新搭 |
| 改稿 Diff | - | - | 100% | 简单组件 |

**总评**：开发风险下降约 **40%**（Auth + Supabase + LLM Client + 项目脚手架 + 日志全部能复用）；新增专属逻辑（决策树引擎 + 思维树可视化 + 改稿对比 + 场景包 prompt）约 60% 工作量。

---

## 推荐启动流程（如确认技术栈）

```bash
# 1. 复用 tiktok_hackathon 项目结构
cp -r /Users/haor/Learning/1_Projects/tiktok_hackathon ./src-template
# 然后改名/移除 tiktok 业务代码

# 2. 升级依赖
npm install ai @ai-sdk/openai @ai-sdk/anthropic zod

# 3. 添加 React Flow（决策树可视化）
npm install @xyflow/react

# 4. 添加 diff 库（改稿对比）
npm install diff
```

---

## 风险点

1. ⚠️ **复用脚手架时清理业务残留**：tiktok_hackathon 有大量照片/EXIF/地图代码，要彻底删除避免 PCG 文档审核时被认为"项目套壳"
2. ⚠️ **Supabase 项目独立**：建议为 PCG 比赛新建一个 Supabase 项目，避免污染既有项目数据
3. ⚠️ **环境变量隔离**：`.env.local` 要新建，不能 cp 旧的
4. ⚠️ **原创性合规**：PCG 评分有"原创要求"——文档可写"基于个人既有项目脚手架进化"，但不能宣称是全新项目
