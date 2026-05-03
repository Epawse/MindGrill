# Agent 工具生态调研：MCP + Skills + Plugins（2026-05-04）

> **目的**: 辩思 (MindGrill) 从"单工具搜索"升级为"原生 MCP + Skills 完整 Agent 架构"
> **参考**: Claude Code, OpenCode, Codex, Pi 的工具集成体系

---

## 一、MCP 2026 现状：已是 Agent 工具的事实标准

| 指标 | 2026数据 | 来源 |
|------|---------|------|
| **企业 AI 团队采用** | 78% 至少有一个 MCP agent 在生产 | Q1 2026 |
| **SDK downloads/月** | 100M+ (Python+TypeScript) | npm + PyPI |
| **公开 MCP Server** | 10,000+ 已索引 | GitHub + marketplaces |
| **治理** | Linux Foundation (Agentic AI Foundation, 2025年底捐赠) | 厂商中立 |
| **原生支持客户端** | Claude/Claude Code, OpenAI Codex/ChatGPT, Google Gemini, MS Copilot, Cursor, VS Code, Zed, JetBrains, OpenCode | 全生态 |

**类比**: MCP = USB-C for AI / LSP for code editors。写一个 MCP server，任何兼容客户端都能用。

---

## 二、顶级 Agent 如何组织工具生态（参考架构）

### Claude Code — 6 层体系

| 层 | 机制 | 作用 |
|----|------|------|
| **MCP Servers** | 开放标准，连接外部工具/数据源/API | 数据库、GitHub、Slack、浏览器等 |
| **Skills** | 可复用的 SKILL.md 文件 (`.claude/skills/<name>/`)，auto-invoke 或 `/name` | 我们已有 grill-me + to-prd |
| **Slash Commands** | 用户显式调用的命令入口 (`/review`, `/deploy`) | 决定性的用户触发 |
| **Hooks** | 生命周期事件处理 (PreToolUse, session start/post-tool) — AI 无法绕过 | 安全 guardrails |
| **Subagents** | 专门的子代理，处理复杂多步任务 | 隔离的 context window |
| **Plugins** | 打包分发层 (`.claude-plugin/plugin.json`, 含 skills+hooks+subagents+MCP config) | 可安装的 marketplace 单元 |

### OpenCode — MCP-first + Plugin 双引擎

| 层 | 机制 |
|----|------|
| **MCP** | 配置文件 `opencode.json` → remote/local MCP servers → 工具自动注册 |
| **Plugins** | JS/TS 插件 → 钩入 pre/post tool use, file change 事件 → 自定义 agent 行为 |
| **Built-in Tools** | 代码读取/写入/终端/LSP 分析 |

### Vercel AI SDK v6 — MCP Client 原生支持 ⭐⭐⭐

**这是对辩思最关键的技术发现**：

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { generateText } from 'ai';

// 1. 初始化 MCP 客户端 (支持 stdio, SSE, Streamable HTTP)
const mcpClient = await createMCPClient({
  transport: {
    type: 'streamable-http',
    url: 'https://your-mcp-server.com',
  },
});

// 2. 获取 MCP 工具 → 直接传入 generateText
const mcpTools = await mcpClient.tools();

const result = await generateText({
  model: openai('gpt-4o'),
  tools: mcpTools,       // ← MCP 工具与 AI SDK 原生融合
  prompt: '...',
  maxSteps: 5,           // 允许多步工具调用 (搜索→读取→追问)
});
```

**意义**: 不需要写 web search / file access / database 的定制集成代码。只需：
1. 在 config 加一条 MCP server URL
2. AI coach 自动发现该 server 暴露的 tools
3. LLM 自主决定何时调用哪个 tool
4. **零额外的 tool registry 代码** — AI SDK 已处理

---

## 三、辩思 Agent 架构设计

### 总体架构：4 层

```
┌────────────────────────────────────────┐
│  Plugin Layer (package/distribute)     │  ← 未来 marketplace
│  coach-skills/{thesis, resume, social} │
├────────────────────────────────────────┤
│  Skills Layer (SKILL.md templates)     │  ← 已设计的3场景 prompt
│  lib/ai/prompts/{thesis,resume,social} │
├────────────────────────────────────────┤
│  MCP Tool Layer (dynamic tools)        │  ← 本次核心新增
│  @ai-sdk/mcp client → any MCP server  │
│  ├─ web search (tavily-mcp)            │
│  ├─ file reading (filesystem-mcp)      │
│  ├─ calendar (google-calendar-mcp)     │
│  └─ ... (user-extensible)              │
├────────────────────────────────────────┤
│  Engine Layer (core logic)             │
│  lib/engine/decision-tree.ts           │
│  lib/ai/provider-registry.ts           │
│  lib/supabase/                         │
└────────────────────────────────────────┘
```

### MCP Server 配置

```typescript
// lib/mcp/servers.ts
export const defaultServers: MCPServerConfig[] = [
  {
    id: 'tavily-search',
    name: 'Web Search',
    transport: {
      type: 'sse',
      url: process.env.TAVILY_MCP_URL || 'https://mcp.tavily.com/sse',
      headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    },
    description: '搜索互联网获取事实、数据、研究验证用户论点',
    autoEnable: true,
  },
  // 未来可加:
  // { id: 'filesystem', ... }         — 读写用户文档
  // { id: 'google-calendar', ... }    — 结合日历验证 deadline 声明
  // { id: 'postgres', ... }           — 查询行业数据库
];
```

### 工具发现与注入

```typescript
// lib/mcp/client.ts
import { createMCPClient } from '@ai-sdk/mcp';

export async function getActiveMCPTools(serverIds?: string[]) {
  const activeServers = defaultServers.filter(
    s => serverIds ? serverIds.includes(s.id) : s.autoEnable
  );
  
  const clients = await Promise.all(
    activeServers.map(s => createMCPClient(s.transport))
  );
  
  // 合并所有 MCP server 的工具为一个 tool map
  const tools: Record<string, Tool> = {};
  for (const c of clients) {
    Object.assign(tools, await c.tools());
  }
  return tools;
}
```

### Grill API Route（最终形态）

```typescript
// src/app/api/grill/route.ts
import { generateText } from 'ai';
import { getModel } from '@/lib/ai/router';
import { getActiveMCPTools } from '@/lib/mcp/client';

export async function POST(req: Request) {
  const { draft, scenario, treeState, userId } = await req.json();

  // 1. LLM + Provider
  const model = getModel(userPreference(userId));

  // 2. MCP Tools（动态发现）
  const mcpTools = await getActiveMCPTools();

  // 3. 一次调用 — AI 自主决定：
  //    - 先搜网验证事实?
  //    - 直接生成追问?
  //    - 需要多步推理?
  const result = await generateText({
    model,
    tools: mcpTools,                // MCP 工具注入
    system: buildSystemPrompt(scenario),
    prompt: buildGrillPrompt(draft, treeState),
    maxSteps: 5,                    // 允许多步
    temperature: 0.4,
  });

  return Response.json(parseGrillResponse(result));
}
```

### Skills 复用

```
skills/
  thesis-coach/SKILL.md     → 论文开题场景: 逻辑严密 + 证据 + 反例
  resume-coach/SKILL.md     → 简历投递场景: STAR + 量化 + 差异化
  social-coach/SKILL.md     → 公众号写作场景: 读者共鸣 + 观点独特
```

每个 SKILL.md = prompt 模板 + Zod schema + accent 渐变。与 Claude Code skill 同格式，**可相互移植**。

---

## 四、为什么"MCP + Skills" > "单点 Tavily 集成"

| 维度 | 单点工具 | MCP + Skills |
|------|---------|------------|
| **搜索** | 硬编码 Tavily API | tavily-mcp / exa-mcp / firecrawl-mcp 任意切换 |
| **扩展性** | 每次加工具需改代码 | 加一条 MCP server config → AI 自动发现 |
| **与 AI 生态互操作** | 否 | 同一个 MCP server 可用于 Claude Code / OpenCode / Cursor |
| **Skills 复用** | prompt 硬编码 | SKILL.md 格式 — 可被 Claude Code 加载，反之亦然 |
| **评委印象** | "接了个搜索 API" | "完整的 Agent 架构，对标 Claude Code 标准" |
| **PDF 加分** | 平淡 | ⭐⭐⭐⭐⭐ "辩思原生支持 MCP 协议，可对接 10,000+ 个工具服务器" |

---

## 五、MVP 范围

| 组件 | MVP? | 理由 |
|------|------|------|
| `@ai-sdk/mcp` client 基础 | ✅ | Vercel AI SDK v6 自带，零额外依赖 |
| `lib/mcp/servers.ts` config | ✅ | 1个文件，20行 |
| `lib/mcp/client.ts` | ✅ | 工具发现 + 缓存 |
| **Tavily MCP server** (搜索) | ✅ | 1条 config → 联网搜索能力 |
| **Exa MCP server** (学术搜索) | ⚠️ | 如果 Exa 提供 MCP endpoint 就加 |
| Skills SKILL.md 3 场景 | ✅ | 已设计，复用 Claude Code skill 格式 |
| Plugin packaging | 📋 later | 赛后做 |
| 用户自选 MCP server UI | 📋 later | 评委 demo 用内置 default servers |

### 不做 MVP
- ❌ 自建 MCP server（直接用现成的 tavily-mcp / exa-mcp）
- ❌ Plugin marketplace
- ❌ Hooks 系统（不需要 guardrails——是写作教练不是代码执行）

### PDF 加分
"辩思采用与 Claude Code 相同的 Agent 架构：Vercel AI SDK + MCP 协议。AI 写作教练可通过标准化接口动态发现和调用外部工具（联网搜索、文件读取、数据库查询等），架构兼容 10,000+ 个已有的 MCP 服务器。Skills 层采用 SKILL.md 格式，可在 Claude Code 与辩思之间双向移植。这意味着辩思不是封闭的写作工具，而是开放的、可演进的思辨 Agent 平台。"

---

## 六、一句话总结

**`@ai-sdk/mcp` + Tavily MCP server = 辩思在1行代码内获得完整的 Agent 工具生态能力。Web search 不是"接入一个 API"而是"接入整个 MCP 生态"。架构与 Claude Code / OpenCode 同源，评委看到的是生产级 Agent 设计。**
