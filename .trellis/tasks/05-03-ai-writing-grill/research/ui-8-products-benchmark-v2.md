# 8 家 + 2 家设计驱动型产品精准调研（2026-05-03 plan 流程版）

> **调研方法**: Grok Search MCP plan_intent → plan_complexity(Level 3) → sub_query(8) → search_term(8) → tool_mapping → execution → 结果
> **session**: `f710261cfb97`
> **对比 v1**: 本次精度明显提升（Arc CSS 变量列表 / Cosmos 确认真实产品 / Amie 三色 hex + CMYK / Linear fontofweb.com token 列表 / Raycast 50-100+ 颜色提取）

---

## 一、v1 vs v2 质量对比

| 产品 | v1 精度 | v2 精度 | 提升 |
|------|---------|---------|------|
| **Arc** | hex 渐变示例 | **完整 20 个 CSS 变量 + arc.net/colors.html** | ⭐⭐→⭐⭐⭐⭐⭐ |
| **Cosmos** | "空间主题概念" | **确认 cosmos.so 真实产品** (moodboard App, #bc361b accent) | ⭐⭐→⭐⭐⭐⭐⭐ |
| **Raycast** | void + accent + 半径 | **50-100+ copycats.design 提取 + Theme Studio JSON** | ⭐⭐⭐→⭐⭐⭐⭐ |
| **Linear** | 描述 | **fontofweb.com 63 色 + getdesign.md + LCH 主题** | ⭐⭐⭐→⭐⭐⭐⭐ |
| **Amie** | 三色 | **三色 hex 精确值 + CMYK + Mobbin+Figma 验证** | ⭐⭐⭐→⭐⭐⭐⭐ |
| **Dot** | 概念描述 | **designer Jason Yuan + 设计逻辑深挖** | ⭐⭐→⭐⭐⭐⭐ |
| **Vercel** | 描述 | **semantic token 10 色板 + geist-colors 包** | ⭐⭐⭐→⭐⭐⭐⭐ |
| **Family** | "crypto wallet 概念" | **仍是设计概念指南，未定位具体 Product** | ⚠️→⚠️ |

---

## 二、8 家产品精准 Design Token 汇总

### 1. Arc — "渐变色 + 玻璃感的 CSS 变量王国"

**来源验证**: arc.net/colors.html 公开页面

| 维度 | Token |
|------|-------|
| **CSS 变量系统** | `--arc-palette-foregroundPrimary/Second/Tertiary` — 前景色三层 |
| | `--arc-palette-background/Extra` — 背景二层 |
| | `--arc-palette-hover/focus` — 交互态（含 alpha）|
| | `--arc-palette-maxContrastColor/minContrastColor` — 对比度极值 |
| | `--arc-background-gradient-color0/1/2` — 背景渐变色 |
| | `--arc-background-simple-color` — 纯色 fallback |
| **渐变方向** | `linear-gradient(135deg, ...)` 普遍 |
| **Alpha 通道** | 8 位 hex `#RRGGBBAA` — e.g. `#4B8E777A` |
| **字体** | Marlin Soft SQ (headings) + Inter (UI body) |
| **暖色示例** | BG `#F4EBE5FF` / accent `#EF8C62FF` / maxContrast `#993810FF` |

**最佳借鉴**: 每场景 3 层渐变色 + 半透明 hover 态。与我们的 3 场景渐变设计吻合。

---

### 2. Dot (New Computer) — "AI 陪伴的 serif 情感深度"

**设计领导者**: Jason Yuan (ex-Apple, Mercury OS creator)

| 维度 | Token |
|------|-------|
| **核心渐变** | 暖日落：橙-粉 → 青/薄荷 (`#FF9A6B` → `#4ECDC4`) |
| **Serif** | 主标题 / 关键话语用 serif — 赋予"gravitas"和人性温暖 |
| **Sans** | Clean sans-serif for body/UI (≈ Inter) |
| **动效** | 流体动画 + 状态检查标记 (√) — 有"呼吸感" |
| **Ac accent** | 暖珊瑚 `#FF7A5E` / 软青 `#A8E6CF` / 紫 `#B39DFF` |
| **中性色** | 暖白 `#F8F5F2` / 深炭灰 `#1C1C1E` |
| **卡/布局** | 大圆角 + 3D lift + 毛玻璃 blur |

**最佳借鉴**: **Serif = AI 的"思考感"**，而非古板——这直接验证了我们的"思源宋体问题=AI的认真"设计决定。

---

### 3. Linear — "暗色暖灰的极致工程精准"

**Token 源**: fontofweb.com/tokens/linear.app (63 色) + getdesign.md

| 维度 | Token |
|------|-------|
| **暗主题底色** | `#030404` (near pure black) / `#161719` (surface) |
| **暖灰文字** | `#e7eaef` (2026 refresh: warmer, less blue) |
| **半径系统** | `3px` / `5.5px` / `8px` / `10px` — **精确到 0.5px** |
| **阴影** | `lch(0 0 0 / 0.02) 0px 3px 6px -2px` — LCH color space |
| **Accent** | 去饱和 indigo/purple 主色 |
| **字体** | Inter for UI (`font-sans`) / Berkeley Mono for code (`font-mono`) |
| **Grid** | 4px 基元 |

**最佳借鉴**: 加入 `6px` badge 半径（4px / 6px / 10px / 16px）。LCH 颜色空间用于 theme generation（PDF 可讲）。

---

### 4. Amie — "愉悦生产力的三文鱼粉"

| 维度 | Token |
|------|-------|
| **主 accent** | `#FF9D9C` (salmon pink) RGB 255,157,156 |
| **中性灰** | `#BFBFBF` |
| **暗底色** | `#171717` (eerie black) |
| **字体** | Inter (primary sans-serif) |
| **动效** | 拖拽反馈 + 自然语言输入 + 流畅 state change |
| **暗/亮** | Dark mode primary |

**最佳借鉴**: "生产力不必是工具——可以是 joy"。融入我们 micro: click button = 淡橙波 + spring bounce。

---

### 5. Cosmos — "moodboard 的真实极简主义" ⭐ v2 重大发现

**确认**: cosmos.so 是真实产品（设计师 moodboard App，非概念）

| 维度 | Token |
|------|-------|
| **底色** | 纯黑/深炭灰 (dark-first)，极简白 (light mode) |
| **Accent** | `#BC361B` (warm earthy red-orange/coral) |
| **设计哲学** | "内容为王" — 中性 UI 退后，user content 前进 |
| **AI** | AI 自动标签图片：颜色、mood、风格。按 hex/颜色搜索 |

**最佳借鉴**: "Content-first neutral shell" — 与我们 Claude 米色"canvas"理念一致。`#BC361B` 比我们的 `#C15F3C` 更深更红，可作 contrast reference。

---

### 6. Raycast — "暗色工具键盘优先"

**Token 源**: copycats.design/raycast-com (50-100+ 色)

| 维度 | Token |
|------|-------|
| **主 red** | `#FF6363` (signature) |
| **Void** | `#07080A` / `#151515` |
| **Surface** | `#222222` / `#2F3031` |
| **Muted gray** | `#434345` / `#6A6B6C` / `#9C9C9D` |
| **Grid** | 8px base |
| **半径** | 4/6/8/10-16px / 9999px (pill) |
| **Font** | Inter + Geist Mono |
| **Theme** | Theme Studio: JSON `{ name, appearance, colors: [...] }` |

**最佳借鉴**: 键盘快捷键 (Enter/1/2/Esc) + 8px grid + pill accent。暗底色我们不照搬。

---

### 7. Vercel Geist — "Swiss 系统性开源设计"

**Token 源**: vercel.com/geist + github.com/geist-org/themes + geist-colors npm

| 维度 | Token |
|------|-------|
| **Semantic tokens** | `--background` (Bg1) / `--foreground` (Color10) / `--background-2` |
| **Color-1-10 scale** | 1-3: component bg (default/hover/active) / 4-6: borders / 7-8: high-contrast / 9-10: text |
| **10 色板** | Gray, Alpha Gray, Blue, Red, Amber, Green, Teal, Purple, Pink |
| **P3** | Wide-gamut color variants |
| **Spacing** | 4px/8px/12px/16px/24px/32px/48px |
| **Font** | Geist Sans + Mono + Pixel (2026 新增) |

**最佳借鉴**: Semantic token naming (Color1-10)。我们的 Tailwind CSS vars 可对齐这一结构。

---

### 8. Family Wallet — "加密钱包的设计趋势"

⚠️ **注意**: 返回的是"加密钱包 UI 设计概念"，未确认名为 "Family" 的具体产品。如用户所指为 family.co (Family Tech venture firm portfolio)，该品牌采用极简黑底设计。

| 维度 | Token（加密钱包设计指南）|
|------|-------|
| **Primary trust** | `#0A2540` (deep navy) / `#0F172A` (dark slate base) |
| **Growth accent** | `#00D4A5` (vibrant teal-green) |
| **Warm accent** | `#FF6B6B` (soft coral) |
| **Light neutral** | `#F8FAFC` |
| **Font** | Inter / SF Pro |
| **Dark-first** | ✅ (premium fintech feel) |

**最佳借鉴**: trust palette (navy+teal) — 可作未来"可信度"UX 增强参考。当前无需融入。

---

## 三、8 家融合到最终 Design Token 的 10 处修订

| # | 来源 | 修订 | v1 未发现? |
|---|------|------|----------|
| 1 | **Arc** | CSS 变量命名采用 `--arc-palette-*` 三层语义模式 | ✅ v2 新增 |
| 2 | **Arc** | 每场景 background-gradient-color0/1/2 三层渐变 | ✅ v2 更精确 |
| 3 | **Dot** | **serif=AI 情感深度**的设计逻辑正式确认 | ✅ v2 深化 |
| 4 | **Dot** | 节点状态标记用 √ 绿色动画 (Amie 的 joy 反馈) | v1 有 |
| 5 | **Linear** | 半径精确到 `5.5px`→ 取整 6px badge (v1 已推) | v2 加固 |
| 6 | **Linear** | 4px UI grid + LCH color space 参考 | ✅ v2 新增 |
| 7 | **Cosmos** | **确认 cosmos.so 真实产品**；`#BC361B` accent = 更深红暖参考 | ✅ v2 重大发现 |
| 8 | **Raycast** | 全键 Enter/1/2/Esc shortcut 已验证可行 | v1 已推 |
| 9 | **Vercel** | semantic `Color-1` to `Color-10` token 命名 | v2 加固 |
| 10 | **Amie** | "joy 反馈"具体为 button = 淡橙波 + spring bounce | v1 已推 |

---

## 四、最终可执行 Token（Tailwind v4 + CSS vars 直接输出）

基于本调研最终的 12 家融合（Apple + Claude + 8 家），不再需要更多调研：

```css
/* === Design Tokens: Claude-Apple-8Products Fusion === */
@theme {
  /* Claude 米色基底 */
  --color-bg: #F0EEE6;
  --color-bg-card: rgba(255, 255, 255, 0.7);
  
  /* Linear 暖灰验证 + Raycast void ref */
  --color-fg: #2C2A26;
  --color-fg-muted: #B1ADA1;
  --color-border: #E8E6DC;
  
  /* Terracotta accent (Claude origin, Cosmos #BC361B ref) */
  --color-accent: #C15F3C;
  --color-accent-hover: #A04D2F;
  
  /* Arc 场景三层渐变 */
  --scene-thesis-0: #667eea;
  --scene-thesis-1: #764ba2;
  --scene-resume-0: #F59E0B;
  --scene-resume-1: #EF4444;
  --scene-social-0: #10B981;
  --scene-social-1: #6366F1;
  
  /* 间距: Linear 4px UI + 8px layout */
  --spacing-ui: 4px;
  --spacing-layout: 8px;
  --spacing-section: 24px;
  
  /* 半径: Linear 精确 → 整数 */
  --radius-pill: 9999px;
  --radius-card: 16px;
  --radius-button: 10px;
  --radius-badge: 6px;
  
  /* 字体: Dot serif 验证 + Inter 共识 */
  --font-serif: 'Source Han Serif CN VF', 'Tiempos Text', 
                'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Inter Variable', 'Source Han Sans SC', 
               'PingFang SC', system-ui, sans-serif;
  
  /* Liquid Glass (Arc/Apple/Dot 共识) */
  --glass-blur: 16px;
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
```

---

## 五、对 1.5 UI/UX 最终决策的结论

**确认 10 处修订**（v1 6 处 + v2 新增 4 处：Arc CSS 变量命名 / Dot serif 验证逻辑 / Cosmos 真实产品 / Linear LCH ref）。设计 token 已收敛到可直接输出 `globals.css` 的程度。不需要更多调研。

**下一步**: 用户确认 1.5 → 更新 prd.md → 推进 grill 1.6（下一个依赖分支——可能是后端 Supabase schema 设计、3 个场景包的 prompt 架构、或产品命名）。
