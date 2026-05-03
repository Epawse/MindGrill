# UI/UX 补充调研（2026-05-03）：Claude Design 工具 × 中文大学生产品 × 字体性能 × SF Pro 许可

> 对 [`ui-design-language.md`](ui-design-language.md) 的 4 处信息缺口进行了补充调研。

---

## 1. Claude Design 工具（Anthropic Labs 2026.4.17 发布）

### 这是什么
- Anthropic Labs **研究预览**（非最终产品），2026.4.17 公开
- 定位：与 Claude Opus 4.7 进行对话式 UI/视觉设计——说需求 → AI 生成可编辑视觉原型
- **不是 Figma 替代品**，而是"非设计师快速原型 + 品牌一致性检查"的 AI Native 工具

### 核心功能
| 功能 | 对本项目的价值 |
|------|---------------|
| **用对话生成 UI** — "Create a writing coach interface with warm beige background" 直接出原型 | ❌ 需要 Pro/Max plan，且需在对话中重新描述全部需求 |
| **自动从 codebase 提取 design tokens** — 读源码/fig/Figma .fig/网页自动生成 tokens | ⭐⭐⭐ PDF 文档可讲"未来可用 Claude Design 实现品牌一致性" |
| **输出到代码** — 一键生成 Next.js + shadcn/ui 代码 | ⭐⭐ Demo 阶段没必要（我们有完整设计 token 了） |
| **与 Figma 无双向集成** — 仅能 import .fig；export 到 Canva/HTML/PDF（不是 Figma）| 不用顾虑 |

### 对我们决策的影响
**几乎为零**——Claude Design 是设计阶段工具，我们 grilling 阶段已手动锁定了所有 design tokens。PDF 文档可写"产品采用 Claude-Apple Fusion 设计系统，未来可导入 Claude Design 实现品牌持续演进"——这是加分项。

---

## 2. 2026 中国大学生 AI 产品视觉趋势

### 调研结果（基于 Soul、Talkie、Momo、豆瓣等案例）

| 趋势 | 是否采用 | 原因 |
|------|---------|------|
| **多巴胺配色**（明亮渐变、活力色） | ❌ | 与"思辨/深度"调性相反；我们做"反浮躁"定位 |
| **Y3K/Liquid Glass/拟物+故障** | ✅ Liquid Glass ✓ / 拟物 ✗ | 只取 Apple Liquid Glass 部分 |
| **3D Avatar + 个性化场景** | ❌ | 不做社交/头像；但思维树视觉化是"思维层面"的个性化 |
| **情绪模式切换** | ⚠️ 不做 | MVP 只保留亮米色，暗色作为未来扩展 |
| **低压匿名氛围**（Momo 化名、Soul 无头像社交） | ✅ 间接采用 | "无需登录即可体验"就是低压门槛的体现 |
| **AI 情绪价值 / 陪伴**（Soul "情绪绿洲"） | ✅ 契合 | 写作教练的"苏格拉底追问"本质是思维层面的情绪支撑 |
| **生成式 UI (GenUI)** | ❌ | 太重，且违背"用户可控、可预测"的拷问基调 |
| **语音 / 多模态交互** | ⚠️ | TTS 语音旁白可选（+0.5 天），不作为核心 |

### 关键洞察：我们有差异化

市面多数大学生 AI 产品（Soul/Talkie/Momo）走"**娱乐 + 陪伴 + 低压**"路线——视觉明亮、卡通化、匿名化。我们的产品定位恰好**反这条路线**——"**学术深度 + 思维拷问 + 思辨高级**"。

→ **视觉语言上也应该反映这个定位**：不用"多巴胺配色"；不用卡通 Avatar；用 Claude 米色 + 思源宋体 + terracotta 暖橙 = "高级学术风"而非"娱乐社交风"。这恰恰是在 2026 大学生 AI 产品红海中**唯一的"反娱乐化"蓝海**。

### 对设计决策的加固
1.3 中我推的 Claude 米色 + serif + Liquid Glass 方案，与市场主流形成**反向差异** → 这应该是**产品核心卖点的一部分**，不只是在 UI 层面——**"视觉即定位"**。

---

## 3. 思源宋体 Web 加载性能（确认 100-300KB 可实现）

### 关键数据
| 字体形态 | 大小 | 是否可用 |
|---------|------|---------|
| 完整 7 权重 CJK | ~10MB / weight = **~70MB** | ❌ 不可用 |
| 简体 CN subset (static) | ~2-3MB WOFF2 / weight | ⚠️ 可用但慢 |
| **Variable CN subset (VF)** | ~5MB OTF → WOFF2 ~2-3MB | ⚠️ 可用但建议再子集化 |
| **Variable CN + Fontmin 子集化（推荐）** | **~100-300KB**（覆盖 3000-8000 常用汉字） | ✅ **实际可用** |
| **Variable CN + Fontmin 子集化（极简）** | **~30-80KB**（仅页面特定字符） | ✅ 最佳 |

### 实现路径（确认）
1. 下载 Adobe GitHub `SourceHanSerifCN-VF.ttf`（CN subset variable）
2. 用 `pyftsubset` 或 `cn-font-split` 按 8000 常用汉字子集化
3. 转 WOFF2（自带 Brotli 压缩）
4. CSS `font-display: swap` + preload → **首屏不白屏，serif 字渐入**

### 加载时间预估
- 100KB WOFF2 + CDN (edge cached) → ~200-500ms → **用户感知不到延迟**
- 如果 Vercel 部署 + CDN → ~100ms 冷启动，后续 0ms (cached)

### Fallback 策略（关键 ⚠️）
```css
font-family: 'Source Han Serif CN', 'Source Han Serif SC', 
              'Noto Serif SC', 'Songti SC', 'STSong', 
              'Tiempos Text', 'Times New Roman', serif;
```
- Chrome/Safari 现代 → Variable Font 生效
- 旧浏览器 / WebView → fallback 到 `Songti SC` (macOS 系统宋体) 或 `STSong` (macOS 旧系统)
- 所有场景都有一个**可读的 serif** 展示，不会无字体

---

## 4. SF Pro 字体 Web 许可（⚠️ 严格受限）

### 关键发现
- SF Pro / San Francisco fonts **不可用于 Web App**（非 Apple 平台应用）
- 许可证明确限制：**仅用于 Apple 平台 mockups**（如 Figma 原型、Xcode 截图）
- **不能 CDN 加载、不能嵌入网页、不能第三方分发**
- 即使是 jsDelivr 等 CDN 上的 SF Pro 镜像，**均违反 Apple 许可证**（不是技术阻止，是法律限制）

### 对本项目的影响
**字体栈必须替换 SF Pro / SF Pro Display** — 用开源等价物：

| 目标 | SF Pro 限制版 | 实际用（MIT/开源）|
|------|-------------|-----------------|
| UI sans | ~~SF Pro~~ | **Inter Variable** |
| UI monospaced | ~~SF Mono~~ | **JetBrains Mono** |
| System Icons | ~~SF Symbols~~ | **lucide-react** (shadcn 默认) |

**更新后的字体栈**：
```css
:root {
  --font-serif: 'Source Han Serif CN VF', 'Tiempos Text', 
                'Source Han Serif SC', 'Noto Serif SC', 
                'Songti SC', serif;
  --font-sans: 'Inter Variable', 'Source Han Sans SC', 
               'PingFang SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', 'SF Mono', monospace;
}
```

> **SF Pro 替换理由**：Inter 的 x-height / spacing / neutrality 与 SF Pro 最接近；且 Google Fonts 托管 + subsetting 成熟 + 可变权重。Tiempos Text（Claude serif）保留，但不可托管（Klim 需要 license）—— PDF 文档可提，Demo 用 Source Han Serif CN VF 即可。

---

## 5. 补调研后的新发现与调整

### 调整 1: SF Pro 完全移除 → Inter Variable
**不影响 UI 质量**（Inter ≈ SF Pro 的设计意图），**解决许可证问题**。

### 调整 2: 思源宋体加载方案确认可行
**100-300KB WOFF2** 加载 < 500ms（Vercel CDN）→ **评委录屏不会被无字体截屏影响**。关键是要在执行任务 2.1 (implementation) 时加入 Fontmin 子集化步骤。

### 调整 3: "视觉即定位"可作为 PDF 卖点
- 市面 AI 产品：明亮色 + 卡通 + 低压 → "娱乐陪伴"
- 我们的产品：米底 + serif + terracotta → "学术思辨"
- → **不只是 UI 选择，是对 AI 赛道的明确立场**——PCG 评委想看的就是这个差异化

### 调整 4: Claude Design 工具可在 PDF 提及
"未来可导入 Claude Design 实现品牌系统持续演进" → **落地可行性加分**

---

## 6. 需要记录到 prd.md / info.md 的变更

- [x] SF Pro 替换为 Inter Variable（许可证）
- [x] 思源宋体子集化策略确认（100-300KB WOFF2）
- [ ] 更新 info.md 技术细节（字体栈 + CDN 预期 + fallback）
- [x] "视觉即定位"角度写入 PDF 文档创意

---

## 总结

本次补充调研主要加固了设计的可行性（字体加载方案可行 / SF Pro 移除 / 思源宋体子集化 OK），并确认了设计差异化在市场中的独特定位。对 grill 1.5 UI/UX 决策没有根本性改变——只有两处微调：Font stack 移除 SF Pro 改为 Inter、字体加载方案加入具体的 subsetting 策略。
