# Multi-Provider AI SDK Landscape (2026-05-03)

> 本研究为 PCG 比赛创意 13 "AI Reverse Writing Coach" 选定多供应商抽象层方案。
> 综合 Cherry Studio (45k⭐ 开源 AI 客户端) + NewAPI/OneAPI (Calcium-Ion fork) + Vercel AI SDK 5/6 + 国内主流 LLM API 兼容现状 + 用户既有项目（tiktok_hackathon）实践。

---

## 主流方案对比矩阵

| 方案 | 类型 | 国内供应商 | 流式 | Structured Output | 学习曲线 | 3 天内可落地 | 推荐度 |
|------|------|-----------|------|-------------------|---------|-----------|-------|
| **Vercel AI SDK 5** | SDK 库 | 部分（社区 provider）| ✅ 一流 | ✅ `generateObject` | 低 | ✅ 极易 | ⭐⭐⭐⭐⭐ **首选** |
| **OpenAI npm + base_url 切换** | 极简 | ✅ 几乎全兼容 | ✅ | ✅ json_object | 极低 | ✅ 半天 | ⭐⭐⭐⭐ **次选/兜底** |
| Vercel AI Gateway | 托管聚合 | 通过路由 | ✅ | ✅ | 极低 | ✅ | ⭐⭐⭐ |
| LiteLLM | Python/JS 聚合 | ✅ 广 | ✅ | ✅ | 中 | ⚠️ Edge 不友好 | ⭐⭐ |
| **NewAPI 自托管网关** | Go 自托管 | ✅ 全 | ✅ | ✅ | 高 | ❌ Demo 不需要 | ⭐⭐ 仅文档讲故事 |
| Cherry Studio 架构 | 桌面客户端参考 | ✅ 全 | ✅ | ✅ | 中（参考用）| 不直接复用 | ⭐⭐⭐ 仅参考 |

---

## 关键发现

### 1. Vercel AI SDK 5/6 是新一代标杆
- 原生支持：OpenAI / Anthropic / Google Gemini / xAI Grok / Azure / Bedrock / Groq / Mistral / **DeepSeek** / **Moonshot Kimi** / Cohere / Fireworks / Together
- **Cherry Studio 用的就是 @ai-sdk + 自定义 wrapper**（45k⭐ 验证可行）
- API 极简：`streamText({ model, prompt })` / `generateObject({ schema, prompt })` 一行调用
- 流式（SSE）+ 结构化输出（基于 Zod schema）+ tool calling 一致接口

### 2. 国内供应商 OpenAI 兼容现状（2026-05）
| 供应商 | base_url | OpenAI 兼容 | json_object | json_schema | 流式 |
|--------|----------|------------|-------------|-------------|------|
| **DeepSeek** | `https://api.deepseek.com` | ✅ 完整 | ✅ | ⚠️ prompt 引导 | ✅ |
| **通义 Qwen** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ 完整 | ✅ | ✅ Qwen3 系列 | ✅ |
| **智谱 GLM** | `https://open.bigmodel.cn/api/paas/v4/` 或 `https://api.z.ai/v1` | ✅ | ✅ | ✅ tool calling | ✅ |
| **腾讯混元** | `https://api.hunyuan.cloud.tencent.com/v1` | ✅ | ✅ | ⚠️ | ✅ |
| **豆包/Volcengine** | `https://ark.cn-beijing.volces.com/api/v3` | ✅ | ✅ | ⚠️ | ✅ |

**结论**：国内主流 5 家都已 OpenAI 兼容，**只需切 base_url + api_key**，不需要每家写 SDK 适配。

### 3. Ollama Cloud Pro（用户明确指定）
- $20/月，3 个并发模型，~50× 免费版用量
- **base_url**: `https://ollama.com/v1`
- **OpenAI 兼容**：完整支持 `/v1/chat/completions`、流式、tools、json mode、vision
- **多模型**：可跑大型 frontier open-weight models（Llama / Qwen / DeepSeek / Gemma 等）
- **用户 tiktok_hackathon 项目就用这个**：`new OpenAI({ apiKey, baseURL: 'https://ollama.com/v1' })`

### 4. NewAPI / OneAPI 自托管网关
- Calcium-Ion/new-api 是 OneAPI 增强 fork（QuantumNous/new-api）
- 单一 OpenAI 兼容端点 → 后端路由到任意供应商
- **本项目用不上**：3 天 Demo 不能多花 1 天部署网关
- **PDF 文档可讲**："未来扩展可自托管 NewAPI 网关实现企业级聚合"

---

## 针对本项目的最终推荐

### 主方案：**Vercel AI SDK 5/6 + 多 provider 工厂**

```typescript
// src/lib/ai/providers.ts
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

// 1. 默认：豆包（OpenAI 兼容）
export const doubao = createOpenAI({
  apiKey: process.env.DOUBAO_API_KEY!,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
})

// 2. Fallback：OpenAI / Claude
export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// 3. 本地兜底：Ollama Cloud Pro
export const ollama = createOpenAI({
  apiKey: process.env.OLLAMA_API_KEY!,
  baseURL: 'https://ollama.com/v1',
})

// 4. 国内备选：DeepSeek（OpenAI 兼容）
export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com',
})

// Provider Registry
export const providers = {
  doubao: { client: doubao, model: 'doubao-seed-1-6-flash' },
  openai: { client: openai, model: 'gpt-4o-mini' },
  ollama: { client: ollama, model: 'gemini-3-flash-preview' },
  deepseek: { client: deepseek, model: 'deepseek-v4-flash' },
} as const

export type ProviderId = keyof typeof providers
```

```typescript
// src/lib/ai/router.ts
import { providers, type ProviderId } from './providers'

export function getModel(providerId: ProviderId = 'doubao') {
  const { client, model } = providers[providerId]
  return client(model)
}

// 选择策略：用户偏好 > 环境默认 > 健康检查兜底
export function selectProvider(userPref?: ProviderId): ProviderId {
  if (userPref && providers[userPref]) return userPref
  return (process.env.DEFAULT_PROVIDER as ProviderId) ?? 'doubao'
}
```

```typescript
// src/app/api/grill/route.ts
import { streamText, generateObject } from 'ai'
import { z } from 'zod'
import { getModel, selectProvider } from '@/lib/ai/router'

const QuestionSchema = z.object({
  branch_id: z.string(),
  question: z.string(),
  recommended_answer: z.string(),
  alternatives: z.array(z.object({ option: z.string(), when_better: z.string() })),
  is_terminal: z.boolean(),
})

export async function POST(req: Request) {
  const { draft, scenario, treeState, providerId } = await req.json()
  
  const result = await generateObject({
    model: getModel(selectProvider(providerId)),
    schema: QuestionSchema,
    prompt: buildGrillPrompt(draft, scenario, treeState),
  })
  
  return Response.json(result.object)
}
```

### 备用方案：纯 `openai` npm + base_url 切换（如果 Vercel AI SDK 在评委 demo 时出问题）
- 已被 tiktok_hackathon 项目验证可用
- **完全相同的代码**，只换 baseURL 即可对接任意 OpenAI 兼容供应商
- 更轻、依赖更少，但失去 `generateObject` 类型安全与 schema 验证

### 不推荐
- ❌ 自建 NewAPI 网关（运维成本超 3 天预算）
- ❌ LiteLLM TypeScript（Edge runtime 兼容性不足）
- ❌ Vercel AI Gateway 作为唯一方案（增加单点 + 可能限流）

---

## 流式 + 结构化 JSON 输出在多供应商下的兼容性

| 模式 | OpenAI/Anthropic | DeepSeek/通义/智谱 | 豆包/混元 | Ollama Cloud |
|------|------------------|-------------------|----------|--------------|
| 流式 SSE | ✅ | ✅ | ✅ | ✅ |
| `json_object` mode | ✅ | ✅ | ⚠️ | ✅ |
| `json_schema` strict | ✅ | ✅ Qwen/智谱 | ⚠️ prompt 引导 | ⚠️ |
| Vercel AI SDK `generateObject` | ✅ | ✅ via OpenAI provider | ⚠️ 测试需要 | ✅ |

**实战建议**：
- 决策树拷问的"问题对象"用 `generateObject` + Zod schema（类型安全 + 自动 retry）
- 流式渲染用户回答触发的连续追问用 `streamText`
- 对豆包/混元先 `json_object` mode + prompt 强约束 schema，验证通过再考虑 `json_schema`

---

## 风险点 & Mitigation

| 风险 | 概率 | 影响 | Mitigation |
|------|------|------|-----------|
| 评委 demo 时豆包限流 | 中 | 高（Demo 失效）| **3 个 provider 自动 fallback**：豆包 → OpenAI → Ollama Cloud |
| 中文长文 OpenAI 翻译腔 | 低 | 中 | 默认豆包/DeepSeek（中文最优）+ prompt 强中文 |
| `generateObject` 在豆包不稳定 | 中 | 中 | fallback 到 `json_object` + 手动 parse + Zod runtime 验证 |
| Vercel AI SDK 6 升级 breaking | 低 | 低 | 锁定 v5 的小版本 |
| Ollama Cloud 海外延迟 | 低 | 低 | 仅作兜底，主路豆包国内 |

---

## 与 Cherry Studio 的差异

| 维度 | Cherry Studio | 本项目 |
|------|--------------|--------|
| 形态 | Electron 桌面客户端 | Web App（Next.js）|
| 供应商管理 | 用户在 UI 自己加 | 后端 env 配 + 前端选 |
| Provider 抽象层 | `@ai-sdk-provider` + `aiCore` 包 | `src/lib/ai/providers.ts` 单文件足够 |
| 模型数 | 300+ | 4-5 个核心 |
| 复杂度 | AGPL 大项目 | 单功能精品 |

**借鉴点**：Cherry Studio 用 Vercel AI SDK 是关键背书——大型生产级 AI 客户端正在用这套方案。

---

## 与 NewAPI 的差异

| 维度 | NewAPI 自托管 | 本项目 |
|------|--------------|--------|
| 形态 | Go 后端网关 | Next.js 全栈 |
| 部署难度 | Docker + DB | Vercel 一键 |
| 适用场景 | 企业级聚合 | 单 Demo 场景 |
| MVP 适配 | ❌ 太重 | ✅ |

**借鉴点**：PDF 文档加一段"未来扩展可对接 NewAPI 自托管网关，实现企业私有部署"。

---

## 一句话推荐

**`@ai-sdk/openai` + 4-5 个 provider 工厂（豆包默认 / OpenAI fallback / Ollama Cloud / DeepSeek 备选）+ `generateObject` 强 schema + 自动 fallback 路由**——15 行代码搞定，3 天可落地，与 tiktok_hackathon 既有模式 100% 兼容（只是从单 client 升级为 provider registry）。
