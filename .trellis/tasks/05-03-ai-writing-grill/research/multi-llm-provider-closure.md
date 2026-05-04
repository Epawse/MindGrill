# Multi-LLM Provider Management Research

> 调研日期: 2026-05-04
> 目的: 闭环 MindGrill LLM 供应商管理，确定最佳实践

## 1. AionUi (iOfficeAI/AionUi) 分析

### 项目概况
- **定位**: 免费开源跨平台桌面 AI Cowork App (Electron + Bun)
- **许可证**: Apache 2.0
- **核心能力**: 统一 20+ CLI 工具 (Gemini CLI, Claude Code, Codex, Qwen Code 等) + 内置 agent engine
- **Stars**: 活跃维护，快速迭代

### AionUi 的 LLM 管理架构

| 能力 | AionUi 实现 | MindGrill 现状 | 差距 |
|------|------------|----------------|------|
| **供应商数量** | 25+ 平台 (含 preset 快选) | 10 家 (9 固定 + 1 自定义) | 覆盖够用 |
| **Multi-API Key Rotation** | ✅ 逗号/换行分隔多 key，自动轮转 (90s blacklist on 401/429/503) | ❌ 单 key per provider | **关键缺失** |
| **Preset 平台快选** | ✅ 选平台自动填 Base URL | ✅ `defaultBaseUrl` 硬编码 | 相当 |
| **模型自动发现** | ✅ 输入 key 后自动拉取可用模型列表 | ❌ `recommendedModels` 硬编码 | 次要差距 |
| **Google OAuth Login** | ✅ Gemini 免 key 登录 | ❌ 仅 API key | 非必需 |
| **Per-conversation 选模型** | ✅ 每会话可选模型 | ✅ Zustand store 支持 | 相当 |
| **OpenAI 兼容自定义** | ✅ 任意 baseURL | ✅ `openai-compatible` provider | 相当 |
| **Key 安全存储** | ✅ 本地 SQLite + credential | ✅ env var | 方式不同但都安全 |
| **运行时切换** | ✅ 不重启切换 | ✅ env 启动时检测 | 略差 (需重启改 key) |

### AionUi 可借鉴的关键模式

#### 1. Multi-API Key Rotation (最高优先级)
```
输入格式: sk-xxx1,sk-xxx2,sk-xxx3
轮转逻辑:
- 随机 load balancing (初始选择)
- 错误检测: 401(auth) / 429(rate limit) / 503(unavailable)
- Blacklist: 失败 key 加入 90s 黑名单
- 恢复: 90s 后自动移出黑名单
```
**对 MindGrill 的价值**: 当前只有 Ollama Cloud Pro + Google AI Studio 两个 key，但如果其中一个限流/宕机，需要自动切换。现有 `withFallback` 是 **跨供应商** fallback，不是 **同供应商多 key rotation**。两者互补。

#### 2. 模型自动发现 (次要)
AionUi 在用户输入 key 后调用 provider 的 `/models` API 拉取可用模型列表。MindGrill 当前硬编码 `recommendedModels`，但这对于 Ollama Cloud Pro 等不断更新模型的 provider 不够灵活。

#### 3. NewAPI 统一网关模式
AionUi 支持 NewAPI 作为统一网关，一个 key 对接多种协议 (gemini/anthropic/openai)。MindGrill 的 `openai-compatible` provider 已覆盖这个场景。

---

## 2. 主流多 LLM 供应商管理方案对比

| 方案 | 类型 | 供应商数 | 适合场景 | 对 MindGrill 适配度 |
|------|------|---------|---------|-------------------|
| **Vercel AI Gateway** | SaaS 托管网关 | 100+ models | 快速原型、零运维 | ⭐⭐⭐⭐⭐ 最佳 — 原生集成 AI SDK |
| **LiteLLM** | 自托管 Python 代理 | 140+ providers / 2600+ models | 企业合规、成本控制 | ⭐⭐ 需额外部署 Python 服务 |
| **OpenRouter** | SaaS 托管网关 | 60+ providers / 300+ models | 多模型实验 | ⭐⭐⭐ 可作为 `openai-compatible` 接入 |
| **AionUi** | 桌面 App 内置 | 25+ providers | 本地桌面 AI | ⭐⭐ 桌面场景，Web 不直接适用 |
| **AI SDK `createProviderRegistry`** | SDK 内置 | 依赖注册的 provider | Next.js 原生 | ⭐⭐⭐⭐⭐ 已在用，需升级用法 |

### 关键发现: Vercel AI SDK 5+ 的 `createProviderRegistry` + `customProvider`

当前 MindGrill 用的是**手写 factory + switch/case + `wrapLanguageModel` middleware** 实现多供应商。
AI SDK 5 提供了更原生的方案:

```ts
// AI SDK 5 原生方案
import { createProviderRegistry, customProvider } from 'ai';

const registry = createProviderRegistry({
  google,           // 'google:gemini-2.5-flash'
  ollama: createOpenAI({ baseURL: 'https://ollama.com/v1' }),
  // ...
});

// 带 fallback 的 custom provider
const grillProvider = customProvider({
  languageModels: {
    'default': registry.languageModel('ollama-cloud:qwen3:235b'),
    'fast': registry.languageModel('google:gemini-2.5-flash'),
  },
  fallbackProvider: registry,  // 未知 model ID 回退到 registry
});
```

**优势**:
- 统一字符串 ID 寻址 (`provider:model`)
- 内置 fallback + retry 支持
- 无需手写 middleware
- AI Gateway 可直接接入 `providerOptions.gateway`

---

## 3. 具体建议: MindGrill LLM 闭环方案

### 当前问题
1. **只有 2 个可用 key** (Ollama Cloud Pro + Google AI Studio)，其余 7 家工厂代码写了但 key 为空
2. **`withFallback` 是跨供应商**，没有同供应商多 key rotation
3. **Factory 用 switch/case**，不如 `createProviderRegistry` 原生
4. **模型列表硬编码**，Ollama Cloud Pro 的模型经常更新

### 推荐方案 (3 天 deadline 下的务实选择)

#### A. 升级到 `createProviderRegistry` (推荐，1-2h)
- 替换 `factory.ts` 的 switch/case 为 `createProviderRegistry`
- 保留 `provider-registry.ts` 作为 metadata 数据源 (displayName, blurb, env keys)
- 保留 `health-check.ts` 和 `router.ts` 的逻辑
- 收益: 原生 fallback、字符串 ID 寻址、未来 AI Gateway 一键接入

#### B. 增加 Multi-Key Rotation (推荐，2-3h)
- 参考 AionUi 的 90s blacklist 模式
- 在 `factory.ts` 层实现: 同一 provider 支持逗号分隔多 key
- 失败 key 加入 blacklist (内存 Map)，定时恢复
- 与现有 `withFallback` (跨供应商) 互补

#### C. Ollama Cloud Pro 模型自动发现 (可选，1h)
- 调用 `GET https://ollama.com/v1/models` 获取可用模型列表
- 前端 provider 选择器动态展示
- 对 Google AI Studio 不需要 (Gemini 模型相对稳定)

#### D. Vercel AI Gateway 接入 (可选，0.5h)
- 只需加一个 `gateway` provider 到 registry
- `providerOptions.gateway.models` 配置 fallback chain
- 需 Vercel 账号开通 AI Gateway

### 优先级排序 (比赛 deadline 2026-05-06)
1. **A (createProviderRegistry)** — 架构升级，后续所有功能基础
2. **B (Multi-Key Rotation)** — 稳定性保障，评委体验不崩
3. **C (模型发现)** — 锦上添花
4. **D (AI Gateway)** — 可在 PDF 文档讲，demo 不一定需要

---

## 4. AionUi 直接可复用的代码/模式

| 模式 | 文件位置 (AionUi) | 复用方式 |
|------|-------------------|---------|
| Multi-Key 解析 | `src/renderer/src/store/llmStore.ts` | 解析逗号/换行分隔的 key 字符串 → `string[]` |
| Blacklist 管理 | `src/renderer/src/store/llmStore.ts` | `Map<string, number>` (key→blacklistUntil timestamp)，每次调用前检查 |
| Provider preset 列表 | `src/common/llm-providers.ts` | 可参考补充 missing baseURL (如 SiliconFlow, xAI, Poe 等) |
| 健康检查 UI | `src/renderer/src/components/ModelSettings/` | 参考 provider 状态 badge 展示 |

**注意**: AionUi 是 Electron 桌面 App (React + Node.js)，MindGrill 是 Next.js Web App。不能直接 import，但**模式可以完整复用**，核心逻辑 (key rotation, blacklist, preset) 都是纯 TS 无框架依赖。