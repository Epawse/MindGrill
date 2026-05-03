# UI/UX 设计语言调研：Apple Liquid Glass × Claude × 中文 Serif (2026-05-03)

> 目标：为 PCG 比赛"AI Writing Drill / 反向写作教练"产品确定精确 design tokens，融合 Apple iOS 26 Liquid Glass + Claude.ai 视觉语言 + 中文 serif 学术调性。

---

## 1. Apple Liquid Glass（WWDC 2025）核心要点

### 设计哲学
- **WWDC 2025 公布**，覆盖 iOS 26 / iPadOS 26 / macOS Tahoe 26 / watchOS 26 / tvOS 26
- 三原则：**Hierarchy（提升内容）/ Harmony（与硬件圆角对齐）/ Consistency（跨平台一致）**
- 半透明 + 实时折射（refraction）+ 动态适应背景

### 关键技术特征
- **Optical**: 半透明 + 实时折射 + specular highlights + adaptive shadows/tints
- **Physical**: 凝胶感弹性 / morph / 触摸反馈 scaling+bouncing+shimmer
- **Functional**: 浮在内容上方作为 navigation/controls 层，不抢内容焦点
- **Adaptivity**: 滚动 edge effects / 焦点状态 / 大小自适应 thicker glass

### 字体规范
- **主字体**: SF Pro (San Francisco)，区分 Display 大字号 / Text 小字号
- **典型 scale**:
  - Large title: ~34pt bold
  - Title: 17-28pt semibold  
  - Body: 17pt regular
  - Caption: 13-15pt
- Line height ~120-141%（视用途）

### Motion 规范
- 弹性 spring + 凝胶 morph + lensing modulation（不是 fade）
- Scaling / bouncing / shimmer 触觉反馈
- 始终 respect `Reduce Motion` accessibility

### 适用边界
- **System Components 自动获得**——SwiftUI/UIKit/AppKit 标准控件即用
- Web 端只能"借鉴风格"，不能照搬（无系统组件）
- **Web 模拟方法**：`backdrop-blur` + 半透明 bg + 半透明 border + soft shadow + Framer Motion spring

---

## 2. Claude.ai 视觉语言（2025-2026）确认色卡

### 核心调色板（**精确值**）
| Token | 实际值 | 用途 |
|-------|--------|------|
| **Background canvas** | **`#F0EEE6`** | 主背景（warm parchment / 米色）|
| **Pampas** | `#F4F3EE` | 次级背景 / 卡片层 |
| **Border** | `#E8E6DC` | 暖灰边框 |
| **Cloudy gray** | `#B1ADA1` | 次要文字 / disabled |
| **Foreground** | 深炭灰（near `#1F1F1E` / `#2C2A26`）| 正文 |
| **Accent terracotta** | **`#C15F3C`** | CTA / 高亮（**修订**：之前推 #CC785C 不准）|

### 字体规范
- **Tiempos Text** (Klim Type Foundry) — 主 serif，AI 回复 + 正文 + 标题
- 旧版用 **Styrene B**，新版升级为 **anthropicSans** + **anthropicSerif**
- 用户输入用 sans 与 AI 回复 serif 形成对比
- Body 16-18px，generous line-height

### 设计哲学
- **Editorial** 编辑式排版（像高端印刷书 / parchment 档案）
- 大量留白 + 细微边框 + 极少装饰
- 卡片软阴影或 flat
- 圆角不过度（不是 pill）
- **Anthropic 2026.4 发布 Claude Design** 工具——证实他们极度重视设计语言

### 真实世界类比
> "高端书籍 / 档案级 parchment paper, 邀请阅读与反思, 不像冷感数字仪表盘"

---

## 3. 中文 Serif - 思源宋体 (Source Han Serif)

### 字体能力
- Adobe + Google 合作 **开源** CJK serif（与思源黑体配对）
- 7 个字重: ExtraLight → Heavy
- 简/繁中文 + 日韩文全覆盖
- 屏幕优化好，2026 文艺 / 高级感首选

### 推荐用法（针对学术 + 大学生场景）
- **标题 / 关键文案**: 思源宋体 Medium / SemiBold
- **正文**: 思源宋体 Regular / Light（提升可读）
- **UI 控件 / 数据**: 思源黑体 Medium 形成层次对比
- **不要**全站纯宋体——会显得过于古板，混搭增强现代感

### CSS 实现（关键）
```css
/* Variable font 优先（性能更好）*/
@font-face {
  font-family: 'Source Han Serif Variable';
  src: url('SourceHanSerifSC-VF.woff2') format('woff2-variations');
  font-weight: 200 900;
}

/* Fallback 链 */
:root {
  --font-serif: 'Source Han Serif Variable', 'Source Han Serif SC', 'Noto Serif SC', 
                'Songti SC', 'STSong', serif;
  --font-sans: 'Source Han Sans SC', 'PingFang SC', system-ui, sans-serif;
  --font-display: 'Tiempos Text', 'Source Han Serif SC', serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}

h1, h2 { font-family: var(--font-serif); font-weight: 600; letter-spacing: 0.02em; }
body { font-family: var(--font-sans); line-height: 1.8; }
.question { font-family: var(--font-serif); /* 决策树问题用宋体 */ }
.answer { font-family: var(--font-sans); /* 用户回答用黑体 */ }
```

### 性能要点
- 子集化必须（思源全集 30+MB）—— 用 fontmin 或 cn-font-split 工具切片
- 优先使用 Variable Font（一份文件 7 字重）
- Fallback 到系统宋体 (Songti SC / STSong) 避免 FOIT
- 备选：Google Noto Serif SC（已托管，加载快但字重少）

---

## 4. Liquid Glass × Tailwind v4 × shadcn/ui 实现方案

### 核心 Tailwind 类组合
```html
<div class="bg-white/70 dark:bg-neutral-900/40
            backdrop-blur-xl
            border border-black/[0.06] dark:border-white/10
            rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]
            transition-all hover:bg-white/80 hover:scale-[1.005]">
  Liquid Glass Card
</div>
```

### 关键 utilities（2026 Tailwind v4）
- `bg-white/70` — 半透明白底（Liquid Glass 核心）
- `backdrop-blur-xl` — 24px 模糊（Apple 实际接近这个值）
- `border-black/[0.06]` — 极淡边框
- `rounded-2xl` (16px) — Apple 风圆角
- `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` — 极淡软阴影
- 配合 Framer Motion `spring stiffness:300 damping:30`

### shadcn/ui 集成路径
- 复用 `<Card>` 组件，extend 出 `<GlassCard variant="liquid">`
- 现成 npm 包（备选）：`@einui/glass-card`、`glasscn-ui`、`@yhooi2/shadcn-glass-ui`
- 推荐：自建 `<GlassCard>` 保持完全可控（10 行代码）

### 性能要点
- `backdrop-filter` 在移动端略有卡顿——评委如在 PC 浏览器为主，影响小
- `isolate` + `will-change: backdrop-filter` 提升 GPU
- 不要在大量节点上同时用 backdrop-blur（思维进化树节点小心 perf）

---

## 5. 三家融合设计 Token（最终推荐）

### 调色板（精确）
```css
@theme {
  /* Claude 米色系 — 主调 */
  --color-bg: #F0EEE6;
  --color-bg-card: rgba(255, 255, 255, 0.7);  /* Liquid Glass */
  --color-bg-pampas: #F4F3EE;
  
  /* 文字 */
  --color-fg: #2C2A26;        /* 主文 */
  --color-fg-muted: #B1ADA1;  /* 次要 */
  
  /* 边框 */
  --color-border: #E8E6DC;
  --color-border-glass: rgba(0, 0, 0, 0.06);
  
  /* Accent */
  --color-accent: #C15F3C;        /* Claude terracotta */
  --color-accent-hover: #A04D2F;
  --color-accent-bg: rgba(193, 95, 60, 0.08);  /* CTA 浅底 */
  
  /* Brand 蓝（PCG 文档徽章用，主调不用）*/
  --color-brand-tencent: #006EFF;
  
  /* Liquid Glass */
  --glass-blur: 16px;
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
```

### 字体栈
```css
@theme {
  --font-serif: 'Source Han Serif Variable', 'Tiempos Text', 'Source Han Serif SC', 
                'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Inter Variable', 'Source Han Sans SC', 'PingFang SC', 
               system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', 'SF Mono', monospace;
}
```

### 字号 scale（响应式）
| Token | Mobile | Desktop | 用途 |
|-------|--------|---------|------|
| `--text-display` | 28px | 40px | 首页大标题 |
| `--text-h1` | 22px | 28px | 决策树问题（serif）|
| `--text-h2` | 18px | 22px | 卡片标题 |
| `--text-body` | 16px | 17px | 正文（Apple 17pt 标准）|
| `--text-sm` | 14px | 14px | 次要 / caption |
| `--text-xs` | 12px | 12px | 标签 |

### 圆角 / 阴影
| Token | 值 | 用途 |
|-------|------|------|
| `--radius-card` | 16px | Apple 风卡片（concentric）|
| `--radius-button` | 10px | Claude 偏小风按钮 |
| `--radius-pill` | 9999px | 标签 |
| `--shadow-glass` | `0 1px 3px rgba(0,0,0,0.04)` | 极淡 |
| `--shadow-elevated` | `0 4px 12px rgba(0,0,0,0.08)` | hover 提升 |

### Motion
```ts
// Framer Motion presets
export const motionPresets = {
  liquidSpring: { type: 'spring', stiffness: 300, damping: 30 },
  liquidEnter: { 
    initial: { opacity: 0, scale: 0.96, filter: 'blur(8px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    transition: { type: 'spring', stiffness: 280, damping: 28 },
  },
  liquidExit: {
    exit: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  },
}
```

---

## 6. 关键组件视觉规范

### 决策树节点（核心组件）
- **容器**: GlassCard（Liquid Glass + rounded-2xl + shadow-glass）
- **问题文字**: 思源宋体 SemiBold 20-22px + accent 色 underline
- **推荐答案**: 思源黑体 Regular 16-17px，浅米底 `--color-bg-pampas` 内嵌卡片
- **选项按钮**: shadcn Button + rounded-button (10px) + outline variant
- **进入动画**: liquidEnter preset

### 思维进化树（React Flow）
- **节点**: 紧凑 GlassCard（80x60px）+ 思源宋体 14px 节点标题
- **边**: 细线 1.5px + accent 色（已遍历）/ 灰 (未到达)
- **背景**: 米色 `--color-bg`，**不要**深色（Apple 大屏液态玻璃靠浅底突出）
- **节点交互**: hover 提升 backdrop-blur + scale 1.02

### 改稿对比
- 左右分屏 GlassCard
- diff 高亮：删除用 `--color-fg-muted` strikethrough；新增用 `--color-accent` underline
- **不用**红绿（Apple/Claude 都避免传统 diff 红绿，用色调对比而非鲜艳对比）

### 顶部导航
- 极简：左 logo + 中标题（serif）+ 右 provider 切换 + 头像
- 整条 nav 是一个 GlassCard（半透明 + blur）

### 微动效
- 按钮 hover: scale 1.005 + shadow 提升
- 卡片 enter: liquidEnter preset
- 决策树推进: spring 推入 + 淡蓝光 trail（极淡，不抢戏）
- 改稿对比展开: stagger 子元素

---

## 7. 三家融合的"独特记忆点"

| 维度 | 一般 SaaS | 我们的产品 |
|------|----------|-----------|
| 背景 | 纯白 #FFFFFF | **米色 #F0EEE6**（Claude 灵感）|
| 主字体 | 系统 sans | **思源宋体 + Tiempos**（Claude + 中文学术）|
| 卡片 | flat / 单色 | **Liquid Glass**（Apple 灵感）|
| accent | 蓝/紫主流 | **Terracotta #C15F3C**（Claude 暖橙）|
| 圆角 | 4-8px | **16px**（Apple concentric）|
| 阴影 | 重 / 多层 | **极淡 0.04 alpha** |
| 动效 | ease-in-out | **Liquid spring + blur transition** |

**评委 30 秒第一印象**: "和市面上 90% 的 AI 工具看起来不一样——更像高端杂志/学术阅读 App，但又有 Apple 的精致感"。

---

## 8. 风险点 & Mitigation

| 风险 | Mitigation |
|------|-----------|
| 思源宋体加载慢（30MB 全集）| 子集化（cn-font-split）+ Variable Font + system fallback |
| backdrop-filter 移动端卡 | 限制使用范围（只 nav + 主卡）；fallback 到 solid bg |
| 评委浏览器若不支持 backdrop-filter | CSS `@supports` 检测 + fallback 实色 |
| accent 橙在米底对比度不够 AA | 测试 WCAG，必要时加深至 `#A04D2F` |
| serif + sans 混搭过度 | 严格区分：问题/标题用 serif，UI/正文用 sans |
| 暗色模式 | MVP 不做（Claude 主线就是亮米，PCG 评委录屏亮色清晰）|

---

## 9. 与 ui-ux-pro-max skill 的协同

ui-ux-pro-max skill 已默认推荐 shadcn/ui + Tailwind 栈。本调研可作为该 skill 的 `style preset` 输入：

- **Style**: minimalism + liquid glass + editorial typography
- **Palette**: Claude beige + terracotta accent
- **Stack**: Next.js + shadcn/ui + Tailwind v4 + Framer Motion + React Flow
- **Font**: Source Han Serif (CN) + Tiempos Text (EN) + Inter (UI)

未来 implementation 时可以让 ui-ux-pro-max skill 基于这份 token 输出具体组件设计。

---

## 10. 一句话总结

**Claude #F0EEE6 米底 + #C15F3C terracotta accent + Apple Liquid Glass 半透明卡片 + 思源宋体 SemiBold 标题 / Tiempos Text 英文 + 16px 圆角 + spring liquid motion** —— 是当下 2026 最稀缺的视觉组合，与市面 AI 工具形成强差异化。
