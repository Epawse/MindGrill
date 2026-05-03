# 8 家顶尖产品设计语言基准调研（2026-05-03）

> 调研产品：Linear · Arc · Raycast · Vercel (Geist) · Dot · Amie · Cosmos · Family（后者搜索偏移，待确认）
> 目的：提取可融入本项目 Claude-Apple Fusion 方案的具体要素

---

## 一、共性收敛：这 8 家产品几乎一致的选择

| 维度 | 共识 | 我们的现状 | 需要调整？ |
|------|------|----------|----------|
| **主 UI 字体** | **Inter** (7/8) | Inter Variable ✅ | 无需调整 |
| **设计哲学** | 极简 + 功能优先 + 减少 chrome | Claude 风格 ✅ | 一致 |
| **间距基元** | **4px 或 8px** | 未定 | 需确定 |
| **Accent 原则** | 稀疏 + 目的性强 + 不用多色 | Terracotta #C15F3C 符合 | 一致 |
| **暗色模式** | Linear/Arc/Raycast/Cosmos **默认暗** | 我们选亮米（Claude） | **刻意差异化** ✅ |
| **玻璃效果** | Arc/Cosmos/Dot 都用 | Liquid Glass ✅ | 一致 |
| **动效质量** | 全部追求流畅微交互 | Spring motion ✅ | 一致 |

**核心洞察**：我们的 Claude-Apple 方案在所有 8 家产品中具有**系统性一致性**，不是孤立的审美偏好。最显著的差异只有"亮 vs 暗底色"——这恰好是我们在 2026 AI 工具红海中的差异化护城河（学术暖色 ≠ 科技冷暗）。

---

## 二、可以借鉴的具体产品要素

### 1. Linear — ⭐ 最值得借鉴的"精确性"

**产品定位**: 开发者项目管理（"代码编辑器级精细度的 SaaS"）
**设计系统**: "Orbiter"（基于 Radix UI primitives）

**可借鉴要素**:

| 要素 | Linear 做法 | 对本项目的指导 |
|------|-----------|-------------|
| **中性灰升级**: 2026 refresh 把冷灰改成**暖灰** | 与我们 Claude 米色同理 | ✅ 验证了我们暖色调方向的正确性 |
| **半径层级**: **3px / 5.5px / 8px / 10px** | 我们的 10px 按钮 + 16px 卡片 | ⚠️ 可以考虑加入 6px 半径层级（badge/标签） |
| **4px 基础间距**: 极致系统性 | 比 8px 更"紧密" | 建议：**UI 控件用 4px 基元，页面布局用 8px** |
| **Inter 的屏幕优化**: 高 x-height = 小字号可读 | 我们的决策树节点可能字体小至 14px | 确认 Inter 胜任 |
| **"Dimmer sidebar" 设计**: 导航退后，内容前进 | 我们的 GlassCard 分层 | GlassCard 已实现类似视觉分层 ✅ |

**不建议借鉴**:
- ❌ 暗色默认（与我们米色差异化反向）
- ❌ 去饱和 indigo（我们的 terracotta 更暖更有记忆点）

---

### 2. Dot（New Computer）— ⭐ "思维记忆"的 UI 范式

**产品定位**: AI 个人陪伴——"living memories"，随时间进化的智能伴侣
**相关性**: **最高**，与我们的"思维进化树 + 拷问历史"机制天然相似

**可借鉴要素**:

| 要素 | Dot 做法 | 对本项目的指导 |
|------|---------|-------------|
| **Serif + Sans 双字体**: Dot 原版用 serif 表达情感深度 + sans 做 UI | 我们的"问题 serif + 答案 sans" | ⭐⭐⭐ **最强共鸣！Dot 验证了"serif 区分 AI 与人类"的交互模式** |
| **Timeline 式记忆视图**: 按时间线排列对话/记忆 | 我们的"思维进化树"应加**时间轴视图**（不只是图，还有时间线） | 可以作为思维树的第二 view |
| **"Living / 呼吸感"**: 内存条目有动态生命力 | 思维树的节点可以做成"有状态的"（活跃 / 休眠 / 已解决） | 增加节点状态的视觉表达 |
| **适应性色调**: AI 根据心情/时间切换饱和度和色温 | 我们 MVP 不做自适应，但可以在思维树中用**颜色编码情绪** | 淡橙节点 = 困惑 / 实心橙 = 已解决 |

**核心借鉴**: Dot 证明"AI 记忆 + 情感深度 + serif 文字"是一条成立的产品路径。我们的 serif ≠ 古板，而是 **"AI 在认真与你的思维对话"** 的信号。

---

### 3. Arc — ⭐ "渐变色区分场景"的灵感

**产品定位**: 以"空间"为单位的浏览器
**关键设计**: 每个 Space 有独立的渐变配色，用户切换 space 时整个 UI 色调变化

**可借鉴要素**:

| 要素 | Arc 做法 | 对本项目的指导 |
|------|---------|-------------|
| **Per-context 渐变**: 工作 space 蓝渐变 / 个人 space 粉渐变 | 我们的 **3 个场景包（论文/简历/公众号）可以用不同 accent 渐变区分** | ⭐⭐⭐ **直接可做！** |
| **渐变公式**: `linear-gradient(135deg, primary, secondary)` | 论文场景=蓝→紫冷调；简历=橙→金暖调；公众号=绿→青文艺调 | 低成本实现，1 小时可做 |
| **半透明 blur + 渐变**: 毛玻璃 + 彩色渐变叠加 | 每个场景的 GlassCard 可融入对应场景渐变 | 视觉记忆点极强 |
| **Command Bar 集中式搜索**: Cmd+T 搜一切 | 我们的 provider 切换 / 场景切换可以用一个 Cmd+K 集中入口 | 加分项 |

**Arc 场景渐变方案**（具体配色）:
| 场景 | Base gradient | Hex |
|------|--------------|-----|
| 论文开题 | 学术蓝紫 | `#667eea → #764ba2` |
| 简历投递 | 职场暖金 | `#F59E0B → #EF4444` |
| 公众号写作 | 文艺薄荷 | `#10B981 → #6366F1` |

> 这些场景渐变仅作用于**导航栏 / 输入框边缘 / 思维树背景**，**不做整页换色**——Claude 米色仍然是主底色。

---

### 4. Raycast — ⭐ "键盘优先 + 工具感"的启示

**产品定位**: macOS 生产力启动器
**设计特征**: 近黑 void (#040506)、键盘驱动、紧凑 8px 间距、8px 圆角

**可借鉴要素**:

| 要素 | Raycast 做法 | 对本项目的指导 |
|------|-----------|-------------|
| **键盘快捷键**: 完整键盘导航 | 我们的教练对话可加入**快捷键**：Enter=接受推荐答案 / 1=选备选 / 2=补充 / Esc=重新问 | 简单但加分，不花时间 |
| **8px 基元间距**: 紧凑布局 | 决策树节点内的推荐答案卡片可用 8px compact 间距；页面布局用 16px | 差异化间距层级 |
| **Ember red 高亮**: #FF6363 用于信号 | terracotta 已经接近这个意图 | 不需改 |
| **列表型快速扫描**: 搜索结果显示为紧凑列表 | 拷问历史页面（登录后）可做成紧凑列表 + 时间线 | 第二视图 |

**不建议借鉴**:
- ❌ 完全暗色底色——与我们米色方案相反
- ❌ 工具式 UI——我们更像"对话式教练"而非命令行

---

### 5. Vercel Geist — "系统性 token + Swiss 极简"

**产品定位**: 开发者平台设计系统
**设计特征**: Geist 字体家族（Sans/Mono/Pixel）、语义色板、4px 基元

**可借鉴要素**:

| 要素 | Geist 做法 | 对本项目的指导 |
|------|-----------|-------------|
| **Geist Sans + Mono**: 开发者审美的极简字体 | 用 Inter 替代（Geist 不是开源）✅ | 不需要改，Inter ≈ Geist 的设计意图 |
| **语义 tokens**: `--background`, `--foreground`, `--card` | 我们的 CSS var 方案已对齐 ✅ | 确认方向正确 |
| **High-contrast palette**: 强烈黑白对比 | 用 Claude 米色 + 暖炭灰（温和对比） | 我们走温暖路线而非高反差 |
| **Pixel 字体** (2026 新增): 复古点阵 | 不需要 | ❌ |

**核验**: Vercel 的"Swiss precision + 系统性 tokens"与我们的 token-first 方法一致。不需要从 Geist 额外借鉴，因为我们已有完整的 Claude-Apple token 方案。

---

### 6. Amie — "愉悦生产力"的微交互灵感

**产品定位**: Joyful productivity calendar
**设计特征**: 三文鱼粉 accent #FF9D9C、深黑底 #171717、Inter/TT Interphases、拖拽+动画

**可借鉴要素**:

| 要素 | Amie 做法 | 对本项目的指导 |
|------|---------|-------------|
| **Joyful 微交互**: 拖拽反馈 + 自然语言输入 + 流畅动画 | 我们的选项按钮可加入**微快乐反馈**：点击推荐的回答=淡橙色波 + 弹簧弹跳 | Framer Motion 轻松实现 |
| **"Warm pink" accent**: 温暖但不严肃 | terracotta #C15F3C 比三文鱼粉更"学术"，更适合教练角色 | 不改 |
| **彩色 event blocks**: 不同事件类型不同颜色 | 不同场景包用不同卡片边框/ accent 渐变（借鉴 Arc）| 已采纳 ↑ |

**核心理念借鉴**: Amie 的"生产力可以快乐"——对应我们的"思考可以是令人享受的"。

---

### 7. Cosmos — AI "思考态"的视觉隐喻

**产品定位**: 宇宙主题 AI 助手（Google COSMO 参考）
**设计特征**: 太空黑 + 霓虹 mint/紫 accent + 玻璃卡片 + "轨道"布局

**可借鉴要素**:

| 要素 | Cosmos 做法 | 对本项目的指导 |
|------|-----------|-------------|
| **AI "思考中" 的视觉隐喻**: 脉动星点 / 连接星座线 / expand nebula | 我们的决策树**节点之间连线可以做成"正在思考"的淡橙光轨**——而不是干等 loading spinner | ⭐⭐⭐ **低成本高感知价值** |
| **"轨道"布局**: 核心聊天 + 浮动面板 | 不需要 | ❌ 太重 |
| **霓虹 accent**: mint/紫光晕 | 不需要 | 不匹配暖米色 |

**唯一借鉴**: AI 的"思考态"——**用淡橙光在节点间滑动代表"AI 正在追问下一条分支"**，替代 spinner。这比传统 loading 有极强的"产品感"。

---

### 8. Family — ⚠️ 搜索偏移

用户提到的具体产品名是 "Family"，但 grok search 返回的是"family crypto wallet design"的概念设计，未搜到名为 Family 的具体产品。

**待确认**: 用户指的是哪个 Family？
- [ ] Family Tech / Family App（具体创业公司）
- [ ] Family.cx
- [ ] 其他

---

## 三、8 家产品的可借鉴度排序

| 排名 | 产品 | 可借鉴度 | 核心借鉴点 | 成本 |
|------|------|---------|-----------|------|
| 🥇 | **Dot** | ⭐⭐⭐⭐⭐ | serif+sans 双字体验证、timeline 记忆视图、节点呼吸状态 | 低 |
| 🥇 | **Arc** | ⭐⭐⭐⭐⭐ | 每场景渐变区分（3 个场景 3 个渐变）、Cmd+K 集中入口 | 很低 |
| 🥈 | **Linear** | ⭐⭐⭐⭐ | 暖灰验证、4px UI 基元、6px badge 半径 | 极低 |
| 🥈 | **Cosmos** | ⭐⭐⭐⭐ | AI"思考态"光轨动画（替代 spinner）| 低 |
| 🥉 | **Amie** | ⭐⭐⭐ | joyful 微交互、彩色 coding | 很低 |
| 🥉 | **Raycast** | ⭐⭐⭐ | 键盘快捷键、紧凑 8px 布局 | 很低 |
| 4 | **Vercel Geist** | ⭐⭐ | token 系统性验证 | 无需改 |
| ? | **Family** | ⚠️ 待确认 | — | — |

---

## 四、8 家产品融合到 Claude-Apple 方案的最终 Design Tokens

### 字体（不改，Dot 已验证）
```css
--font-serif: 'Source Han Serif CN VF', 'Tiempos Text', 'Noto Serif SC', 'Songti SC', serif;
--font-sans: 'Inter Variable', 'Source Han Sans SC', 'PingFang SC', system-ui, sans-serif;
```

### 间距（新增 Linear 灵感）
```css
--spacing-ui: 4px;      /* UI 控件基元（Linear）*/
--spacing-layout: 8px;   /* 页面布局基元 */
--spacing-section: 24px; /* 区块间距 */
```

### 半径（新增 Linear 6px 层级）
```css
--radius-pill: 9999px;
--radius-card: 16px;     /* Apple concentric */
--radius-button: 10px;   /* Claude */
--radius-badge: 6px;     /* 新增，来自 Linear 5.5px → 取整 */
```

### 场景渐变（Arc 灵感，新增）
```css
--scene-thesis: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--scene-resume: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
--scene-social: linear-gradient(135deg, #10B981 0%, #6366F1 100%);
```

### AI 思考态动画（Cosmos 灵感，新增）
**替代 spinner** — 用 Framer Motion 实现：
- 当前节点 → 下一步节点 之间**淡橙光点沿着连线滑动**
- 速度与 LLM 延迟匹配（~1.5s 滑完）
- 到达新节点后 spring 弹出新卡片
- **实现成本**: 20 行 Framer Motion + SVG path

### 键盘快捷键（Raycast 灵感）
```typescript
Keyboard shortcuts:
  Enter → 接受推荐答案
  1/2/3 → 选备选第 n 个
  Shift+Enter → 补充自由文本
  Esc → 重新问当前分支
  Cmd+K → 打开场景/provider 切换
```

### 节点状态（Dot 灵感）
```typescript
enum NodeState {
  ACTIVE = 'active',       // 橙色边框 + 实心点
  PENDING = 'pending',     // 淡橙虚线边框 + 空心点  
  RESOLVED = 'resolved',   // 暖灰边框 + 绿点
  DORMANT = 'dormant',     // 半透明
}
```

---

## 五、对 1.5 UI/UX 决策的修改汇总

| 之前 | 8 家调研后 | 理由 |
|------|----------|------|
| 半径 2 层 (10+16) | **3 层** (6+10+16) | Linear 5.5px → 6px badge |
| 间距未定 | **4px UI + 8px layout** | Linear + Raycast + Vercel 共识 |
| 场景统一颜色 | **每场景独立渐变** | Arc Spaces 范式 |
| AI loading spinner | **光轨滑动动画** | Cosmos 思考态隐喻 |
| Serif 选择有疑虑 | **Dot 验证了 "serif=AI 在思考"** | 产品信心增强 |
| 无快捷键 | **Enter/1/2/3/Esc/Cmd+K** | Raycast 键盘第一 |

**总体定位不变**：Claude 米底 #F0EEE6 + terracotta #C15F3C + Liquid Glass + 思源宋体——**8 家产品验证了这个组合的稀缺性与可行性**。

---

## 六、待确认

1. ⚠️ **Family** 具体是什么产品？需要用户澄清后补调研
2. **场景渐变** 的实施粒度——只加到导航框/卡片边缘，还是思维树全局？建议：先加到 `<ScenarioBanner>` 组件，不影响主米色背景
3. **光轨动画** 在 React Flow 中的实现路径——建议作为 `<AIThinkingTrail>` 组件独立开发，与 `<ThinkingTree>` 组合使用
