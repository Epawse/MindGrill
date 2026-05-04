# AI Reverse Writing Coach (PCG Contest Entry)

> 工作名 / Working name: **AI Writing Drill** —— 中文产品名待定（候选：辩思 / 想清楚 / 拷问者 / Drillit）

## Goal

为参加腾讯 PCG 校园 AI 产品创意大赛（2026 首届，截稿 2026-05-06 23:59）打造一款**反工具化**的 AI 写作产品：不直接帮你写，而是用"决策树拷问 + 推荐答案"的机制帮你**想清楚**。瞄准 AI 时代大学生写作焦虑的真实痛点（论文/简历/PS 等），与现有"AI 帮你写"工具（笔灵/通义/Sudowrite/Notion AI 等）形成差异化定位。技术机制借鉴 [mattpocock/grill-me](https://github.com/mattpocock/skills)（GitHub 53.4k stars 验证）的"决策树遍历追问 + 推荐答案"模式，首次将其从"程序员代码设计"领域迁移到"中国大学生写作思维教练"领域。

## What I already know

* PCG 比赛截稿 2026-05-06 23:59，剩 ~3.5 天（个人赛、不限专业、可用低代码）
* 提交物：Demo 链接 + 录屏（≤3 分钟）+ PDF 文档；评分 5 必要项（赛道适配 / 完整性 / 创新 / 用户洞察 / AI 原生）+ 2 加分（落地可行 / 商业化）
* 选择**开放赛道**（"AI 搞定校园生活"）；需结合 PCG 业务场景
* 6 份既有调研 + 1 份深度调研存在 [`_local/`](../_local/)：
  - [`_local/idea_deep_dive_2026-05-03.md`](../../../_local/idea_deep_dive_2026-05-03.md) — 综合分析，创意 13 总分 33/35
  - [`_local/competitive_research_report.md`](../../../_local/competitive_research_report.md) — 红海/蓝海赛道对比
  - [`_local/research_track_overview_v2.md`](../../../_local/research_track_overview_v2.md) — 2026 技术栈数据
  - [`_local/pcgai_contest_overview.md`](../../../_local/pcgai_contest_overview.md) — 官方文件（题目原文 + 评分细则）
* 直接竞品：
  - **mattpocock/grill-me**（53.4k⭐）— 程序员设计代码用的拷问 skill；机制完美但场景错位
  - **Mind Kit**（小红书黑客松 2026 评审推荐）— 思维拓扑图，但非写作场景
  - **薯医 NoteRx**（黑客松 AI 原住民单元奖）— 小红书爆款笔记诊断 Agent；偏数据指标
  - **SocraDraft / Critical Inker / Authorship AI**（国际）— Socratic 式追问写作教练
  - **国内**：笔灵 / WPS AI / Notion AI 主流是"AI 帮你写"路线，缺"AI 帮你想"垂直产品
* 核心硬约束（用户明确）：**不自己拍视频 / 不调用 AI 视频生成 API / 不做原始用户调研**
* 技术现状：
  - 火山引擎豆包 LLM/TTS：流式首包 < 300ms，1.3 元/千字（中文最优）
  - 混元 Hy3 preview：256K 上下文，中文长文最强
  - OpenAI Realtime API：~300ms p50 端到端，$0.30/min（高品质 fallback）
* AI 写作工具年留存 21% vs 非 AI App 30.7%（Lensa/妙鸭警示）—— 必须有内容沉淀机制

## Requirements

### 核心功能

1. **决策树拷问引擎**：用户提交一段写作或一个想法 → AI 解析关键论点 → 按"论点 → 证据 → 反驳 → 修正"决策树逐节点追问
2. **一次一问 + 推荐答案**：每次只问一个问题，附上 AI 的推荐答案 + 1-2 个备选；用户回 yes/no/补充即可推进
3. **场景模板包**：MVP 至少支持 2 个场景模板（建议：学术论文开题 + 简历投递）；其余 3 个（公众号/PS 文书/面试自陈）作为后续扩展
4. **可探索而不滥问**：如果用户已写的草稿里能找到答案，AI 不再追问（直接读懂并标注）
5. **思维进化轨迹**：完整对话结束后，生成一棵"我从模糊→清晰"的决策树可视化（带时间戳，可导出/分享）
6. **PRD 改稿对比**：拷问结束后，用户可一键看到"原始草稿 vs 拷问后改稿"的左右对比

### 体验要求

7. 评委 30 秒内能用：登录页（或免登录直接体验）→ 选场景 → 粘贴草稿 → 第一个问题秒出
8. 全流程响应：每个问题 < 3 秒生成（火山引擎流式可达）
9. 中文为主，简体优先（Z 世代大学生表达风格）

### PCG 业务结合（PDF 文档必讲）

10. 腾讯文档嵌入故事：作为多人协作时的"AI 思考教练"——每人提论点，AI 拷问每人的论据
11. 腾讯新闻嵌入故事：读完深度报道，AI 用决策树追问"你赞同还是反对？"
12. 微信读书嵌入故事：批注时反思追问

## User Stories

* 作为大学生，我在写论文开题报告卡壳时，想要一个能帮我**想清楚论点是否站得住**的工具，避免写完被导师打回
* 作为应届生，我在改简历时，想知道"项目经历"中**哪些细节真正打动 HR**，而不是被 AI 改成千篇一律的模板
* 作为公众号写作者，我有了大概想法但不确定**论据是否扎实**，希望被 AI 反向追问以暴露逻辑漏洞
* 作为申请季学生，我在写 PS 时希望被追问"你说这件事改变了你，具体改变在哪里？"——而不是 AI 直接代写
* 作为读者，我在读完一篇深度长文后，希望 AI 用苏格拉底式追问帮我反思我的赞同/反对依据
* 作为评委，我打开 Demo 后 30 秒就能体验一次完整的"被拷问"体验，理解产品独特定位
* 作为参赛者，我希望 PDF 文档能讲清楚"反工具化"定位 + grill-me 53.4k stars 的市场验证 + 中国大学生场景垂直 + PCG 业务嵌入故事

## Acceptance Criteria

* [ ] Demo 链接可在浏览器中直接打开，无需安装
* [ ] 至少 2 个场景模板（论文开题 + 简历投递）端到端流程跑通
* [ ] 决策树追问平均轮次 5-8 轮，每轮 AI 必须给出推荐答案
* [ ] 拷问结束后展示"思维进化树"可视化 + "原稿 vs 改稿"对比
* [ ] 端到端响应时间：粘贴草稿到第一个问题出现 < 5 秒；后续每问 < 3 秒
* [ ] 录屏 ≤ 3 分钟覆盖：开场（30s）+ 完整决策树流程演示（2min）+ 亮点总结（30s）
* [ ] PDF 文档结构完备：用户洞察、产品方案、AI 原生能力说明、加分项；明确引用 grill-me 53.4k stars 数据
* [ ] 文档讲清楚"AI 不写，AI 让你想清楚再写"的反工具化差异化定位
* [ ] 可选：决策树可导出为图片/PDF 用于社交分享（裂变属性）

## Definition of Done (team quality bar)

* Demo 链接稳定可访问至 5 月底（评审期间不能挂）
* 录屏含语音讲解或字幕（官方硬性要求）
* 命名规范：「选手名_开放赛道_AI Writing Drill_Demo演示.mp4」「选手名_开放赛道_AI Writing Drill_说明文档.pdf」
* PDF ≤ 50MB，MP4 ≤ 500MB
* 文档无水印杂音，原创合规
* Demo 没有依赖任何 IP 授权 / 用户自定义数据集
* 所有内容由 LLM 现场生成，零数据预制（与用户硬约束一致）

## Technical Approach

**核心架构**：Next.js (App Router) + 服务端 LLM 流式 → 客户端实时渲染追问。

**追问逻辑**：用提示工程实现"决策树 + 推荐答案"模式，不需要训练。每轮调用 LLM 时传入：
- 用户原稿 + 已解析的决策树状态
- 当前需要追问的"分支节点"
- 模板：要求 LLM 输出 `{question, recommended_answer, alternatives, branch_id}` JSON

**可视化**：决策树用 React Flow 或 D3 渲染；时间维度用动画回放。

**部署**：Vercel 一键部署（PCG 官方 FAQ 已确认 Vercel 可作 Demo 链接）。

### Modules to build/modify

* **`<DraftIntake>`** — 用户粘贴草稿 + 选场景的入口；tests: no（UI 模块）
* **`<DecisionTreeEngine>`** — 决策树状态管理 + 与 LLM API 通信的核心模块；tests: yes（单元测，关键逻辑）
* **`<QuestionRenderer>`** — 渲染单轮问题 + 推荐答案 + 用户回答按钮；tests: no
* **`<ThinkingTreeViz>`** — 思维进化树可视化（React Flow）；tests: no
* **`<RevisionDiff>`** — 原稿 vs 改稿左右对比；tests: no
* **`<ScenarioPack>`** — 场景模板配置（论文/简历各一个 prompt 模板）；tests: yes（模板内容覆盖）
* **`<LLMAdapter>`** — 抽象 LLM 调用层，支持火山引擎/混元/OpenAI 切换；tests: yes（接口契约）

### Architectural decisions

* **LLM 选型**：默认火山引擎豆包（中文最优 + 流式 < 300ms + 性价比高），fallback OpenAI；理由：中文场景 + 评委体验秒级响应
* **是否登录**：MVP 不登录，无持久化（评委即用即玩）；持久化作为加分项放后续
* **场景包数量**：MVP 只做 2 个（论文开题 + 简历投递），3 天可控；其余作为"未来扩展"在文档讲故事
* **可视化方案**：React Flow（社区成熟、3 天可集成）；不自己写 SVG
* **响应模式**：服务端流式（SSE/WebSocket），避免长 LLM 调用让用户等
* **不做事项**：不做用户系统、不做支付、不做 AI 训练、不做数据分析后台

## Decision (ADR-lite)

**Context**: 在 PCG 比赛 3.5 天 deadline 下，需要在"创新 + 完成度 + AI 原生 + PCG 业务结合"四项核心评分项上拿满分。

**Decision**: 选定**赛道 = 开放赛道（校园生活）**，**形态 = Web App + 决策树拷问引擎**，**机制 = 借鉴 grill-me 模式**，**场景 = 论文+简历+公众号 3 个场景**，**LLM = 完整多供应商抽象层（架构支持 8+ 家），当前实测可用 = Ollama Cloud Pro 主 + Google AI Studio 辅（其他 provider 工厂代码就绪、env 空）**。

### Resolved by grill 1.1: 激进 90% 完成度（用户选）

**Scope**: 单个 trellis 任务覆盖 9 大模块（任务 2 仅承接溢出复杂度，目标仍是单任务做完大部分）：
1. 入口（粘贴草稿 + 选场景）
2. 决策树拷问引擎（一次一问 + 推荐答案 + 5-8 轮）
3. 思维进化树可视化（React Flow，从 stretch goal 升级为必做）
4. 原稿 vs 改稿左右对比
5. **3 个场景包**（论文开题 + 简历投递 + 公众号写作）
6. 多 LLM 供应商抽象层（豆包默认 + OpenAI fallback + Ollama 本地）
7. 决策树导出图片/分享卡片（社交裂变）
8. **登录系统**（升级，作为加分项）
9. **数据库持久化**（基于 memexflow Supabase 经验复用）—— 用户的"我的拷问历史"沉淀

**Consequences**:
- ✅ 登录 + 持久化 = 真产品级体验，"产品化"评分项满分
- ✅ "我的拷问历史"= 内容沉淀机制，规避 Lensa/妙鸭式短命命运
- ✅ 复用 memexflow 的 Supabase 集成 + tiktok_hackathon 的 ai studio/ollama 经验，**开发风险下降 ~40%**
- ⚠️ 工作量上升约 1 天（登录 0.5 天 + 持久化 0.5 天），需要充分复用既有项目代码
- ⚠️ 多供应商抽象层选型必须先调研 2026 最新方案（已派 trellis-research）

**Out of 80% (明确不做)**:
- ❌ 5 个场景全做（多于 3 个）
- ❌ 移动端原生 App
- ❌ 真实 PCG 业务嵌入（仅 PDF 文档讲故事）
- ❌ 多人协作 Demo
- ❌ 用户自带 API Key（BYOK）
- ❌ AI 模型微调或 LoRA 训练

### Resolved by grill 1.2: 多 LLM 供应商方案（修订 2026-05-03，再修订）

**架构原则**: 完整的多供应商抽象层——支持 8+ 家 LLM provider 工厂（OpenAI / Anthropic / Google AI Studio / DeepSeek / 通义 / 智谱 / 混元 / 豆包 / Ollama Cloud / 自定义 OpenAI-compatible URL）。每个 provider 工厂代码写齐，运行时通过环境变量按需启用。

**当前实测可用配置（用户持有的 API key）**:
- **主**: **Ollama Cloud Pro**（$20/月，OpenAI 兼容，base_url `https://ollama.com/v1`，跑 open-weight frontier 模型如 qwen3 / gpt-oss / deepseek-v4 / gemma-3）—— 通过 `@ai-sdk/openai` + 自定义 baseURL 接入
- **辅**: **Google AI Studio**（Gemini 3 Flash / Gemini 3.1 Flash / Gemini 3 Pro）—— 通过 `@ai-sdk/google` 原生接入；多模态强 + 长上下文 + 免费额度大
- 其他 6+ 家：代码写齐，env 留空，UI 显示"未配置"——评委 / 未来用户补 key 即用

**关键设计**:
- Provider Registry 模式（参考 Cherry Studio `packages/aiCore`）：每个 provider 一个工厂函数 + metadata（display name / 是否需要 baseURL / 推荐模型列表 / 是否支持 vision / json_schema）
- 健康检查：启动时检测哪些 provider 有 key → UI 仅启用可用的；未配置的灰显并提示"需配置 XX_API_KEY"
- 自定义 OpenAI-compatible URL：用户可在 UI 添加任意自托管网关（未来 NewAPI 实例 / Vercel AI Gateway / 公司私有部署）
- 决策树问题用 `generateObject` + Zod schema（强类型 + 自动 retry）；流式追问用 `streamText`
- 自动 fallback 路由：主 provider 限流 / 失败 → 自动切到下一个 available provider
- Vercel AI SDK 5+ 同时支持原生 + OpenAI-compatible 两种接入方式

**对评委 / 文档的价值**:
- 完整多 provider 抽象 = "AI 原生性 + 落地可行性"评分项满分（不是写死单一模型）
- 文档可讲：架构灵活，企业部署可对接 NewAPI 自托管网关 / Vercel AI Gateway / 任意 OpenAI 兼容供应商
- 评委 demo 时可在 UI 切换 provider 体验差异（"我们换成 Gemini 3 Pro 试试"）

详见 [`research/multi-provider-ai-sdk.md`](research/multi-provider-ai-sdk.md)。

### Resolved by grill 1.3+1.5: 技术栈 + UI/UX Design Tokens

**最终技术栈** (Next.js 14 Web App):

| 层 | 选型 | 来源 |
|---|------|------|
| 框架 | Next.js 14 App Router + React 18 + TypeScript | 复用 tiktok_hackathon 脚手架 |
| LLM 调用 | Vercel AI SDK 5 (`ai` + `@ai-sdk/openai` + `@ai-sdk/google`) | 1.2 决策 |
| UI | shadcn/ui + Tailwind CSS v4 + lucide-react | ui-ux-pro-max + 12 产品验证 |
| 状态 | Zustand + localStorage (访客) / Supabase Auth (登录) | memexflow + tiktok |
| 数据库 | Supabase (Postgres + Auth) — 新建独立项目 | memexflow 经验复用 |
| 可视化 | @xyflow/react (React Flow) | 决策树 + 思维进化树 |
| 对比 | `diff` npm + 自制左右分屏 | — |
| 动画 | Framer Motion (liquid spring: stiffness 280, damping 28) | 12 产品调研一致性选择 |
| 部署 | Vercel (SSE 友好 + PCG FAQ 确认) | — |
| 包管理 | pnpm | tiktok 一致 |

**跨平台预埋**: `lib/ai/` + `lib/engine/` 为纯 TS (platform-agnostic)，不依赖 Next.js runtime。未来需要 iOS App 可复用。3 天 Demo **不引入** Expo/React Native/Reanimated/Skia。

**最终 Design Tokens** (Claude-Apple-8Products Fusion，可直接输出到 `globals.css`):

```css
@theme {
  /* Claude 米色基底 */
  --color-bg: #F0EEE6;
  --color-bg-card: rgba(255, 255, 255, 0.7);
  --color-fg: #2C2A26;
  --color-fg-muted: #B1ADA1;
  --color-border: #E8E6DC;
  --color-accent: #C15F3C;           /* Claude terracotta */
  --color-accent-hover: #A04D2F;
  
  /* Arc 场景三层渐变 */
  --scene-thesis-0: #667eea; --scene-thesis-1: #764ba2; /* 论文冷紫 */
  --scene-resume-0: #F59E0B; --scene-resume-1: #EF4444; /* 简历暖金 */
  --scene-social-0: #10B981; --scene-social-1: #6366F1; /* 公众号文艺青 */
  
  /* 间距: Linear 4px UI + 8px layout */
  --spacing-ui: 4px; --spacing-layout: 8px; --spacing-section: 24px;
  
  /* 半径: Linear 精确 + Apple concentric */
  --radius-pill: 9999px; --radius-card: 16px; --radius-button: 10px; --radius-badge: 6px;
  
  /* 字体: Dot serif 验证 + Inter 共识 */
  --font-serif: 'Source Han Serif CN VF', 'Tiempos Text', 'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Inter Variable', 'Source Han Sans SC', 'PingFang SC', system-ui, sans-serif;
  
  /* Liquid Glass (Apple + Arc + Dot 共识) */
  --glass-blur: 16px; --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.06); --glass-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
```

**速度原则** (Gemini + Linear 验证):
- 按钮响应 < 100ms → Local-first 乐观更新 (useOptimistic)
- AI 返回 < 300ms → 流式 streamText
- 首屏 < 2s → SSR + 子集化字体 (100KB)
- AI 思考态 = 淡橙光轨滑动替代 spinner (Cosmos 灵感)

详见 [`research/ui-design-language.md`](research/ui-design-language.md) / [`research/ui-8-products-benchmark-v2.md`](research/ui-8-products-benchmark-v2.md) / [`research/gemini-analysis-verification.md`](research/gemini-analysis-verification.md) / [`research/tech-stack-deep-dive.md`](research/tech-stack-deep-dive.md)。

### Resolved by grill 2.0: Agent 工具层 — MCP + Skills

**Decision**: 辩思原生支持 **MCP (Model Context Protocol) + Skills** 完整 Agent 架构。通过 `@ai-sdk/mcp` (Vercel AI SDK v6) 动态发现和调用 MCP 工具。

**核心理念**: 同一个 grill-me 追问方法论，在辩思中被**场景化 + 可视化 + 零门槛包装**：

| 层 | 作用 | 实现 |
|----|------|------|
| **MCP Tool Layer** | 动态工具发现（搜索/文件/日历/...） | `@ai-sdk/mcp` + 10,000+ MCP server 生态 |
| **Skills Layer** | 3 场景教练模板 | 论文/简历/公众号 SKILL.md (Claude Code 兼容) |
| **Engine Layer** | 决策树拷问逻辑 | `lib/engine/` 纯 TS |
| **UI Layer** | 可视化 + 学术氛围 | 米底 + 思源宋体 + Liquid Glass + 思维进化树 |

**默认 MCP Server**: Tavily Search MCP (联网搜索)。可扩展任意 MCP server——用户只需加一条 URL config，AI coach 自动发现新工具。

**产品 vs grill-me**:
grill-me = 通用追问方法论（面向开发者，CLI，暗色终端）
辩思 = 场景化写作教练（面向大学生，零门槛，学术氛围，思维可视化）
→ 同一方法论，不同受众和形式。"Keep App vs 私教方法论"的关系。

**Skills 跨平台**: 辩思的 SKILL.md 格式与 Claude Code skill 双向兼容。论文教练 skill 可在 Claude Code 中加载，反之亦然。

详见 [`research/agent-tool-ecosystem.md`](research/agent-tool-ecosystem.md) / [`research/web-search-providers.md`](research/web-search-providers.md)。

### Resolved by grill 1.9+1.10: 决策树引擎 + 场景 Prompt 架构

**引擎**: 纯 TS (lib/engine/)，4 态 (INTAKE→GRILLING→THINKING→COMPLETE)，Map-based node graph。零框架依赖，可序列化到 Supabase jsonb。NodeStatus: PENDING/ACTIVE/RESOLVED/SKIPPED。

**场景 Prompt**: 3 模板 (buildThesisPrompt / buildResumePrompt / buildSocialPrompt)，每场景差异 = 追问侧重 + accent 渐变 + coach persona。LLM 输出严格 Zod schema，can_skip:true 时该节点免问。

### Resolved by grill 1.8: Supabase Schema

**Decision**: 2 表 (profiles + grill_sessions)，tree_snapshot jsonb 存完整决策树。RLS user 隔离。Supabase Auth Magic Link 复用 memexflow 经验。

### Resolved by grill 1.7: 产品命名

**Decision**: 中文 **辩思** / 英文 **MindGrill**。两个字 + serif 视觉 + "辩证思考"双关。英文致意 grill-me (53.4k⭐)。

### Resolved by grill 1.6: 登录策略

**Decision**: **软登录**（免登体验 默认 + 可选 Supabase Auth 升级）。

**三层**:
1. **默认**: 打开链接 → 直接入场 → 选场景+粘贴草稿+完成完整拷问 → 无需登录（Zustand + localStorage session）
2. **升级**: Demo 结束时提示"登录保存你的思考轨迹" → 展示"我的拷问历史"
3. **Auth**: Supabase Magic Link (无密码) 或 Google OAuth 一键。复用 memexflow Supabase Auth 集成。

**不做**: SQLite/WASM 本地数据库（与首屏 <2s 冲突 + 不需要离线场景）。

### Resolved by grill 1.11+1.12+1.13: 脚手架 + 录屏 + PDF

**脚手架**: 从零搭建 Next.js 14 项目（`create-next-app` + shadcn/ui + Tailwind v4 + Zustand + Supabase），不复用本地参考项目。

**录屏 (提交物 2)**:
| 段 | 时长 | 内容 |
|----|------|------|
| 开场 | 20s | "辩思 — AI 反向写作教练。不帮你写，帮你**想清楚**。 |
| 核心 | 2min | 匿名入场→选简历场景→粘贴项目经历→AI 5轮拷问→原稿vs改稿对比 |
| 高潮 | 20s | 思维进化树回放 "你在3分钟内经历了这样的思考变化" |
| 收尾 | 20s | 登录→展示历史→"辩思，让 AI 帮你真正想清楚" |

**PDF (提交物 3)** — 7 章按 PCG 模板 + 差异化卖点前置:
1. 封面 + 定位 2. 用户洞察 3. 产品方案 4. AI 原生能力 5. 落地可行性 6. 商业化 7. 设计哲学

### Resolved by grill 1.4: Form Factor

**Decision**: **Web App 优先 + 移动响应式 + PWA 增强**（不做微信小程序、不做原生 App、不做桌面）。

**关键点**:
- Vercel 部署 Next.js 14 → 评委浏览器秒开（PCG FAQ 已确认 Vercel 可作 Demo 链接）
- 移动响应式：mobile-first Tailwind v4，PC + 移动端双适配
- PWA 增强：一份 `manifest.json` 让用户可"添加到主屏"，体验接近原生
- 微信内置浏览器兼容：评委即便在微信群里点链接也能直接打开
- **微信小程序腾讯生态加分点留给 PDF 文档讲故事**："未来扩展可上架小程序，对接腾讯文档"
- 复用 tiktok_hackathon Next.js 14 + SSE 流式模式，节省 ~1 天

## Out of Scope

* 多人协作功能（PCG 业务嵌入只在文档讲故事，不在 Demo 实现）
* 支付 / 订阅
* AI 模型微调或 LoRA 训练
* 移动端 native App（Web 响应式即可）
* 国际化（仅中文）
* 5 个场景全部实现（MVP 仅 3 个，其余 2 个仅在文档列出）
* 录屏后期剪辑专业制作（基础录屏 + 字幕即可）
* 真实用户访谈数据
* 视频生成 / 视频素材
* BYOK（用户自带 API Key）—— 后台管理多供应商即可
* PCG 业务嵌入 Demo（腾讯文档/腾讯新闻只在 PDF 讲故事）

## Research References

* [`../../../_local/idea_deep_dive_2026-05-03.md`](../../../_local/idea_deep_dive_2026-05-03.md) — 创意 13 综合评分 33/35，3 个原候选 vs 8 个新创意横评
* [`../../../_local/competitive_research_report.md`](../../../_local/competitive_research_report.md) — 6 赛道竞争热力图，赛道 1/4 蓝海，赛道 3 红海陷阱
* [`../../../_local/research_track_overview_v2.md`](../../../_local/research_track_overview_v2.md) — 2026 LLM/TTS 技术栈最新数据
* [`../../../_local/pcgai_contest_overview.md`](../../../_local/pcgai_contest_overview.md) — 官方题目原文 + 评分细则
* [`../../../_local/creative_ideas_hub.md`](../../../_local/creative_ideas_hub.md) — 30+ 创意分赛道
* GitHub: [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) — 53.4k stars，机制原型
* 小红书 REDtech 2026 黑客松 — Mind Kit（思维拓扑图，评审推荐）+ 薯医 NoteRx（爆款笔记诊断，AI 原住民单元奖）

## Technical Notes

* PCG 官方 FAQ：Vercel/Netlify/GitHub Pages 均可作 Demo 链接；不会写代码可用低代码平台
* PCG 文档需含模块四（加分项）：落地可行性 + 商业化思考
* 评委偏好：真实痛点 + 技术深度可控 + 演示故事性 + 社交属性
* 火山引擎豆包 API：参考 [developer.volcengine.com](https://developer.volcengine.com/articles/7628812815666511908)
* React Flow: [reactflow.dev](https://reactflow.dev/)
* 关键数据点（PDF 引用）：
  - mattpocock/grill-me 53.4k stars / 4.5k forks（市场验证）
  - 国内 AI 写作工具年留存 21% vs 非 AI 30.7%（用户痛点：工具型流失）
  - SocraDraft / Critical Inker / Authorship AI 国际同方向先例（说明赛道存在）
  - 中国大学生 GenAI 渗透率 99%+（市场存在）
* 比赛战略：避开"AI 帮你写"红海，主打"反工具化"——文档第一句话锚定差异化定位

## Open Questions

* ~~1-13: 全部已 grill 解决~~ ✅
* 后续实施阶段的细节 (component tree、CSS 精确实现、Supabase migration SQL) — 进入 Phase 2 后由 trellis-implement sub-agent 自行决定

---

## Grill 决策树总结

| # | 决策 | 结果 |
|---|------|------|
| 1.1 | 完成度边界 | 90% 激进版（9 模块 + 登录 + 持久化） |
| 1.2 | LLM 供应商 | 完整多供应商抽象层（8+ 家工厂），实测 Ollama Cloud Pro + Google AI Studio |
| 1.3 | 技术栈 | Next.js 14 + shadcn/ui + Zustand + Supabase + Vercel + Framer Motion |
| 1.4 | Form Factor | Web-first + PWA（不做小程序/原生 App） |
| 1.5 | UI/UX Design | Claude-Apple Fusion (米底 #F0EEE6, terracotta #C15F3C, 思源宋体, Liquid Glass, spring motion) |
| 1.6 | 登录策略 | 软登录（免登默认 + Supabase Auth 可选） |
| 1.7 | 产品命名 | 中文: 辩思 / 英文: MindGrill |
| 1.8 | Supabase Schema | 2 表，jsonb 决策树 |
| 1.9 | 引擎 | 纯 TS 4 态状态机 (lib/engine/) |
| 1.10 | 场景 Prompt | 3 模板 + Zod schema |
| 1.11 | 脚手架 | 从零搭建 Next.js 14 项目（create-next-app + shadcn/ui + Tailwind v4） |
| 1.12 | 录屏 | 4 段结构 (20s+2min+20s+20s) |
| 1.11 | 脚手架 | 复用 tiktok_hackathon Next.js 14 项目骨架 |
| 1.12 | 录屏 | 4 段 (20s+2min+20s+20s)，匿名入场→拷问→思维树回放→登录展示历史 |
| 1.13 | PDF 文档 | 7 章 (PCG 模板 + 设计哲学差异化) |
| 2.0 | Agent 工具 | MCP + Skills (Vercel AI SDK @ai-sdk/mcp, Tavily MCP server, 3 场景 SKILL.md) |

**Grill complete**. 14/14 决策全部锁定。
