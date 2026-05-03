# LLM Web Search 能力提供方式调研（2026-05-03）

> **目的**: 为辩思 (MindGrill) 加入联网搜索——AI 写作教练在拷问过程中调用网络证据验证用户论点
> **产品场景**: 用户声称 "性能提升 30%" → AI 搜索 "React performance optimization benchmarks 2026" → 追问 "行业基准是 40-60%，你的 30% 相比如何？"

---

## 一、8 大 Web Search API 对比矩阵

| API | 搜索类型 | 速度 | 定价 (每1K次) | 免费 tier | AI Agent 优化 | 提取正文 | 2026 推荐 |
|-----|---------|------|-------------|----------|-------------|---------|---------|
| **Tavily** | AI native + citation | p50 ~180ms | $8 (credit 制) | 1000 credits/月 | ⭐⭐⭐⭐⭐ | ✅ raw | 🥇 **首选** |
| **Exa** | 语义 + neural | ~200ms (instant) | $7 | ~1000 次试用 | ⭐⭐⭐⭐⭐ | ✅ full | 🥈 |
| **Firecrawl** | 搜索+提取+Agent | ~1-2s (agent) | usage-based | 有限免费 | ⭐⭐⭐⭐⭐ | ✅ Markdown | 🥉 如果需要深提取 |
| **Serper** | Google SERP | ~1-2s | **$0.3-1** | 有限 | ⭐⭐⭐ | ❌ | 预算极限备用 |
| **Brave** | 独立索引 | ~1s | $5 | ~1000 次/月 | ⭐⭐⭐ | ❌ | 隐私优先备用 |
| **Perplexity Sonar** | 合成答案 | 2-5s | $5-12 | 有限 | ⭐⭐⭐⭐ | ⚠️ 黑盒 | 快速验证用 |
| **Jina Reader** | URL→Markdown | ~1s | token-based | 有限 | ⭐⭐⭐ | ✅ | 仅提取不搜索 |
| **Google CSE** | custom sites only | ~1s | 配额制 | 有限 | ⭐ | ❌ | 不做通用 |

### 关键洞察

1. **AI-Native (Tavily/Exa/Firecrawl) > 传统 SERP (Serper/Brave)** — AI native 返回结构化、可引用的 LLM 就绪数据。传统 SERP 返回搜索引擎结果片段，LLM 需要再爬页面。

2. **Tavily 被 Nebius 收购 (2026.2)** — 仍在活跃更新，但长期方向略有不确定性。对 MVP 影响不大。

3. **Tavily = grok-search MCP 底下的搜索源之一** — 我们在当前对话里用到的 grok-search MCP 配置了 Tavily API（来自 config check: `TAVILY_ENABLED: true`）。这验证了我们已有的 Tavily 使用经验。

4. **Ollama Cloud Pro 无原生 web search** — 搜索未返回相关功能。它提供的是 LLM 推理 + OpenAI 兼容 chat endpoint，没有搜索 API。

5. **Vercel AI SDK 原生支持 Tavily + Exa** — 通过 `@ai-sdk/openai-compatible` 和 function calling。不需要额外 bridge。

---

## 二、逐方案深度

### Tavily ⭐⭐⭐⭐⭐ **首选**

| 维度 | 详情 |
|------|------|
| **核心能力** | `/search` (实时搜索+rerank), `/extract` (URL→正文), `/research` (多步 Agent 搜索, 2026 GA), `/crawl`, `/map` |
| **LLM 优化** | 结构化输出 + 引用标注 + PII 过滤 + prompt injection 保护 + LangChain/LlamaIndex/Vercel AI SDK 集成 |
| **定价 (2026.5)** | Researcher 免费: 1000 credits/月。Project: $30/4000 credits ≈ $7.5/1k。Pay-as-you-go: $0.008/credit |
| **搜索消耗** | 基础搜索 = 1 credit ($0.008)；高级搜索 = 2 credits |
| **关键风险** | Nebius 收购后的产品方向。但对短期不影响。 |

### Exa ⭐⭐⭐⭐

| 维度 | 详情 |
|------|------|
| **核心能力** | 语义搜索 (neural embeddings)、Deep Search (Agentic 多步推理)、结构化 JSON Schema 输出 |
| **特色** | "Highlights" = 查询相关的关键摘录 → token 效率极高。Sub-200ms Instant 搜索。People/Company/Code/Paper 垂直索引。 |
| **定价** | $7/1k (基础 10 结果含 highlights)。Deep: $12/1k。Deep-Reasoning: $15/1k。含免费试用 credits。 |
| **优势** | 语义深度 > Tavily。适合需要"理解论文/代码/专利" 的学术教练场景。 |
| **劣势** | 比 Tavily 贵 2x。对普通新闻搜索不如 Tavily 覆盖广。 |

### Firecrawl ⭐⭐⭐⭐

| 维度 | 详情 |
|------|------|
| **核心能力** | 搜索 + 正文提取 (Markdown/JSON) + `/agent` 端点 (一步到位) |
| **特色** | 自建 curated 索引，偏权威/新鲜内容。适合"搜+读"联合场景。 |
| **定价** | usage-based，比 Tavily 贵，但提供完整正文（不需要另调 /extract） |
| **适合** | 深读型代理任务（如"找 3 篇 React 性能优化的文章并提取全文"） |

### 其他

| API | 适用场景 | 不选的理由 |
|-----|---------|-----------|
| **Serper** | 最低成本、最高量 | 传统 SERP，无提取。需额外爬取。不适合教练场景（要精准证据）。 |
| **Brave** | 隐私优先 | 无正文提取。Tavily/Exa 的 AI 优化更强。 |
| **Perplexity** | 快速问答 | 黑盒。"一次性答案"≠ "搜索证据来源"。教练要可控引用。 |
| **Jina** | URL→正文 | 不搜索，只提取。可作为 Tavily 的"/extract"替代。 |
| **Google/Bing** | 不要碰 | Bing 2025.8 退役；Google CSE quota 太紧。 |

---

## 三、辩思 Web Search 场景分析

### AI 写作教练什么时候需要搜网？

| 场景 | 举例 |
|------|------|
| **事实核查** | "用户简历写提升转化率 35% → AI 搜行业平均转化率提升数据 → 追问'你的 35% 是否高于行业？基于什么指标？'" |
| **学术证据** | "论文论点：'微前端提升开发效率' → AI 搜微前端 ROI 研究 → 追问'有实证吗？哪个团队的什么研究？'" |
| **案例对比** | "用户说'用 Next.js SSR 优化了性能' → AI 搜 Next.js SSR benchmark 2026 → 追问'你的 LCP 降到了多少？高于行业中位数吗？'" |
| **数据时效** | "用户引用的是 2023 年的市场数据 → AI 搜 2026 最新数据 → 指出时效差异" |

### Web Search 在拷问流程的位置

```
用户论点 → Grill 引擎节点 → [此处] Tavily 搜索 ← 搜索结果 → LLM 生成追问
                                    ↑
                              触发条件: 论点含数据声明/事实引用/时效性
```

**不是每条追问都用搜索**。触发条件：
- 节点 branchLabel 含 "证据/数据/案例/基准"
- 用户原文含数字/百分比/年份
- 引擎判定需要外部事实验证

---

## 四、对辩思的技术方案推荐

### 首选: **Tavily + Exa 双源，Tavily 默认**

| Provider | 角色 | 何时调用 |
|---------|------|---------|
| **Tavily** | 默认搜索 | 普通事实核查 + 新闻 + 行业数据 |
| **Exa** | 深度语义 | 学术论文/技术白皮书/代码相关 (论文开题场景) |
| **Firecrawl** | 深提取 | 需要抓取多页完整正文的研究任务（MVP 后，PDF 文档讲）|

### 架构: 与 LLM Provider 同模式

```typescript
// lib/search/providers.ts
export interface SearchProvider {
  name: string;
  search(query: string, opts?: SearchOpts): Promise<SearchResult>;
}

export const searchProviders: Record<string, SearchProvider> = {
  tavily: { search: async (q) => { /* Tavily API with OpenAI-compatible base */ } },
  exa: { search: async (q) => { /* Exa JS SDK */ } },
  // firecrawl, brave — 可选扩展
};

// 默认选择: TAVILY_API_KEY 存在→ tavily, 否则降级
```

### Vercel AI SDK 集成

```typescript
// lib/ai/tools/web-search.ts
import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: '搜索互联网获取最新事实、数据、研究来验证用户论点',
  parameters: z.object({
    query: z.string().describe('搜索查询'),
    domain: z.enum(['general', 'academic', 'tech']).optional(),
  }),
  execute: async ({ query, domain }) => {
    return await getSearchProvider().search(query, { domain });
  },
});
```

### MVP 可用 API

- **Tavily free tier (1000 credits/月)**: Demo 期间够用（演示一次拷问最多 3-5 次搜索 = 3-5 credits）
- **Exa free trial**: 论文场景备用
- **不加 Firecrawl/Brave/Serper 进 MVP**: 文档讲"未来扩展"

### 不做
- ❌ 自建搜索索引/爬虫
- ❌ 仅用 LLM knowledge cutoff（时效性差，失去"实时证据"的教练价值）
- ❌ Bing API (已退役)
- ❌ Ollama Cloud Pro web search (不存在)
- ❌ 把 grok-search MCP 当 API 用（那是开发工具，不是产品 API）

### PDF 加分项
"搜索层采用 Tavily + Exa 双引擎。对标顶级 AI Agent 的搜索架构（Firecrawl/Perplexity 同等标准），确保 AI 写作教练引用的证据实时、可追溯、可引用。"

---

## 五、一句话总结

**Tavily (AI-native, LLM 就绪, 免费 demo, grok MCP 已验证) + Exa (学术深度备用，论文场景)**——与 LLM Provider 同架构（provider registry + Zod tool），MVP 零额外成本。
