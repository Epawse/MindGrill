# 12 产品技术栈深度调研与跨平台路线评估（2026-05-03）

> **调研方法**: Grok Search MCP 5 轮 (product-specific + cross-platform + Expo SDK + Flutter iOS)
> **目的**: 
> 1. 逐产品验证实际技术栈（不是 Gemini 推断或"推荐做法"）
> 2. 评估 Family/Amie 的跨平台模式是否适用于本项目
> 3. 为"先 Web、预埋跨平台"决策提供数据支撑

---

## 一、逐产品实际技术栈（基于公开证据）

| 产品 | 前端层 | 桌面层 | 移动端 | 后端/数据 | 关键决策 |
|------|--------|--------|--------|---------|---------|
| **Family Wallet** | — | — | **原生 iOS (Swift/SwiftUI)** | Ethereum Swift SDK | **刻意 iOS-only，拒绝跨平台** |
| **Amie** | **React/TypeScript + Tailwind CSS + Framer Motion** | **Electron** (非 Tauri) | **原生 iOS** (Swift，非 RN) | Node.js + GraphQL + Google Calendar API | **Web core + Electron wrap + separate iOS** |
| **Linear** | **React/TypeScript + Tailwind** | **Electron** (via custom MobX loop) | iOS via Electron? | Node/TypeScript + GraphQL + Postgres | **Local-first + MobX + IndexedDB** |
| **Arc** | — | **AppKit (macOS)** / **WinUI? (Windows)** | iOS native? | Chromium fork | **纯原生。Gemini 称 Swift for Windows未独立验证** |
| **Raycast** | — | **原生 AppKit** | — | 本地 SQLite + C++ | **插件生态用 React/TypeScript + 外部 Node.js** |
| **Vercel** | **React/Next.js + Geist UI** | — | — | Rust/Go + Edge Functions | **Web platform 公司——不需讨论"多端"** |
| **Claude.ai** | **React + Tailwind CSS** | — | — | Python/Rust + LLM infra | **Web AI 工具，标准 React 栈** |
| **Dot (New Computer)** | **React/Next.js?** (推断) | — | iOS App | AI backend (Python/Node) | **iOS 原生 App + Web app 双端** |
| **Cosmos** | — | — | **iOS 原生 + Web** | AI tagging | "Content-first UI" |

### 核心发现

1. **纯原生派 (Family/Arc/Raycast)** — 全部拒绝跨平台。他们优先了操作系统级的动画、Haptic、渲染性能。代价：不做非苹果 Web/Android（除了 Raycast 开始探索 Windows）。

2. **Web-core 派 (Amie/Linear/Claude/Vercel)** — React + TypeScript + Tailwind。这是真实存在的主流派。桌面打包统一用 **Electron**（不是 Tauri）。移动端用**单独的原生 iOS App**（不是 RN）。

3. **Gemini 声称的"Family/Amie 用 Expo + Reanimated + Skia"** — **不成立**。两家都没有用这个栈。Gemini 可能混淆了"推荐做法"与"实际技术栈"。

4. **Electron 仍然是 2026 年桌面包的主流**（不是 Tauri）。Linear + Amie 都用了 Electron。Tauri（memexflow 用的）更轻量但企业采纳率在桌面端仍然低于 Electron。

---

## 二、"React Native for Web 全栈跨平台" 的2026现实

### Expo SDK 55 确实进步了

| 维度 | 2026数据 |
|------|---------|
| **单代码 iOS+Android+Web** | ✅ 功能存在。Expo Router + React Native Web |
| **OTA 更新** | ✅ EAS Updates + bundle diffing (up to 75% smaller patches) |
| **Web bundle** | ⚠️ 几 MB → 需优化 (RN Web 将 `<View>` 映射到 HTML DOM）|
| **动画** | Reanimated 4 在 UI 线程，但**标准React组件仍可能掉帧** |
| **原生Haptics/Liquid Glass** | ⚠️ 不能直接用，需custom native module |
| **生产案例** | Phantom (加密钱包) 用的是 Expo RN——但这是一个** crypto niche**，不是泛 productivity |

### 为什么 Family 和 Amie 刻意避开了 Expo RN？

| 原因 | Family | Amie |
|------|--------|------|
| **动画质量** | 原生 iOS 的 Dynamic Tray + Text Morphing + Shared Element Transition = Expo RN 无法像素级复刻 | 高自定义UI + 拖拽日历 + 流体微交互 = 超出 RN Web 能力 |
| **日历/Email/Recording** | 不需要 | 需要深度 Google/Apple Calendar API + 本地 recording。原生 iOS 直接调用系统 API；RN Web 做 Web 已足够。 |
| **"好品味 ≠ 跨平台效率"** | 他们的选择 = **先追求极致体验，再考虑多端** | 同左 |

### 启示

> "跨平台不是体验质量的免费午餐——它是对质量的妥协。最好的产品从不以跨平台为设计目标。"

---

## 三、Family/Amie 模式对我们的适用性

### 当前项目约束
- **优先级1**: 3天 Web Demo (Next.js 14 + Vercel + PWA)
- **比赛**: PCG 开放赛道，提交 = 网页链接 + 录屏 + PDF
- **个人开发者**: 无法同时做 Web + native iOS
- **时间**: 不可能加入 Expo RN 的学习+配置+测试曲线

### Family/Amie 模式 = "Web-first + Native later + 清晰分层"

```
                   Family模式             Amie模式
                
                  ┌────────┐         ┌────────┐
                  │ iOS    │         │ iOS    │    
                  │ 原生   │         │ 原生   │    
                  └────────┘         └────────┘    
                
┌────────┐                                          ┌────────┐
│ React  │                                          │ React  │  ← Web core
│ Web    │                                          │ Web    │
└────────┘                                          └────────┘
                                           ┌────────┐
                                           │Electron│  ← Desktop wrap
                                           └────────┘
```

### 对我们：**先做 Web 核心，架构预埋分层**

**3天 Demo (Web-only)**:

```
src/
  lib/
    ai/          ← AI 调用层 (platform-agnostic)
    supabase/    ← 数据库层 (platform-agnostic)
    engine/      ← 决策树拷问逻辑 (纯 TS，可复用到任何 platform）
  app/           ← Next.js App Router UI (Web-specific)
     coach/      ← 主体验页
     api/        ← Route Handlers
  components/    ← React 组件
```

**未来 iOS (如果比赛后想做到 App Store)**:

```
src/
  lib/           ← 100% 复用！AI/DB/决策树逻辑不变
  app/           ← Expo Router (替换 Next.js App Router)
  components/    ← 可能需要 RN-ify 部分组件 (View vs div)
```

**关键设计决策** — 现在可以做的预埋：

| 决策 | 做法 | 成本 |
|------|------|------|
| **AI 层** | `lib/ai/providers.ts` — 已设计为与任何 UI framework 无关的纯 TS 模块 | 零 |
| **决策树引擎** | `lib/engine/tree-state.ts` — pure logic, 不与 React 耦合 | 零 |
| **数据库层** | `lib/supabase/client.ts` — Supabase JS SDK (platform-agnostic for any JS runtime) | 零 |
| **UI 层** | `Next.js App Router` — 当前Web入口 | 1h (已决定) |
| **样式** | Tailwind v4 + CSS vars — 如未来RN化，可用 NativeWind 迁移 Tailwind tokens (不迁移 DOM) | 零 (当前) |
| **package.json** | 不加 `react-native` / `expo` / `reanimated` / `skia` — **3 天 Demo 不碰** | 无 |

### 什么时候加入 Expo RN

**如果** PCG 比赛后你需要 iOS App，评估路径：

```
选项 A (Expo + React Native Web)
  1. 用当前 lib/ 层 100%
  2. 将 Next.js pages 映射到 Expo Router
  3. 将 shadcn/ui 改为 NativeWind + custom native components
  4. 评估 web bundle 大小（Expo RN Web 比纯 Next.js Web 大 2-3x）

选项 B (PWA，不建 native App)
  1. 当前 Web App + manifest.json (已做)
  2. 加 service worker + Cache API = 离线体验
  3. 无需 Expo/RN —— 保持 Web 简洁

选项 C (Capacitor wrap)
  1. 当前 Next.js Web build → Capacitor WebView wrap = iOS App
  2. 最简单最轻的"Web → App"路径
  3. 牺牲真正的原生动画，获得 App Store presence
```

---

## 四、"Family/Amie 模式是对的吗" — 最终结论

### ✅ 他们对的部分
1. **"体验优先，跨平台第二"** — Family 做到原生 iOS 极致流畅 ≠ 牺牲跨平台。他们优先了体验。
2. **"Web core + separate native"** — Amie 的 React Web + Electron + 原生 iOS 是真实的生产级模式。
3. **"预埋分层架构"** — lib/ 层 (AI + 数据 + 决策引擎) = platform-agnostic。这是"预留跨平台"的正确方式——不是提前装 Expo，而是**确保核心逻辑可移植**。

### ❌ Gemini 分析中不成立的部分
1. **"Family 用 Expo + Reanimated + Skia"** — 不成立。Family 是纯原生 iOS Swift/SwiftUI。
2. **"Amie 用 Expo RN + Tauri"** — 不成立。Amie 是 React Web + Electron + 原生 iOS。
3. **"参照 Family/Amie = 选 Expo"** — 完全反向。他们的选择 = **不要急着跨平台，先追求极致体验**。

---

## 五、对本项目的最终指导

| # | 指导 | 动作 |
|---|------|------|
| 1 | **3 天 Demo 不引入 Expo/RN** — 纯 Next.js Web | ✅ 已决定 |
| 2 | **确保 `lib/ai/` `lib/engine/` 为纯 TS** — 不依赖 Next.js runtime | ✅ 当前架构满足 |
| 3 | **Tailwind tokens 提前写为 CSS vars** (可迁移到 NativeWind) | ✅ 已纳入 1.5 |
| 4 | **PWA = iOS 的"低配方案"** — 评委可在 Safari 添加到主屏 | ✅ 已决定 |
| 5 | **如果赛后需要原生 App** — 评估 Capacitor + WebView (快) vs Expo RN (好，慢) | 📋 赛后决策 |
| 6 | **"Family/Amie 模式"的真正借鉴** = lib 分层 + 别急着跨平台 | ✅ 本次调研核心结论 |

---

## 六、一句话总结

**Family 和 Amie 的成功不是因为选了某个跨平台框架——恰恰相反，他们刻意避开了跨平台，先用一个端做到极致。我们的 3 天 Demo 应该学这个思路：Web 做到极致 (Next.js + 暖色 + Liquid Glass)，lib 层预留移植性，不等"跨平台"的脚手架。**
