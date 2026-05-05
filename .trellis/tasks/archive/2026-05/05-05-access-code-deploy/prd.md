# 访问码系统 + 部署配置

## Goal

为 PCG 校园 AI 创意大赛评委体验提供防滥用入口控制（码即额度），并完成 Vercel 部署 + 域名 + Supabase 生产配置，使评委打开链接即可零摩擦使用。

## What I already know

* 已有 Supabase 项目 `mindgrill` (Tokyo, ref: drtzjkhzycdftofindsg)
* 已有 env key 免登模式 — 匿名用户走 env key，无需注册
* 已有 `src/middleware.ts` — 当前只刷新 Supabase auth session
* 已有 `src/lib/supabase/middleware.ts` — `updateSession()` 函数
* 已有 auth 路由 (sign-in, callback, sign-out)
* 已有 provider-config-ui — 登录用户可自配 API key
* 没有自定义域名 — 需要购买 + 绑定 Vercel
* 没有部署过 Vercel — 需要首次部署 + env 配置
* 评委场景：中国校园网络、大概率不注册、需要零摩擦体验
* 威胁：链接被转发社交媒体、爬虫批量调用、恶意刷量

## Requirements

1. **访问码门控**: 评委通过 `?code=MG-JUDGE-<12随机字符>` URL 参数或页面内输入码获取额度；输入码后设 cookie（7 天有效）；已登录用户自动绕过
2. **码即额度**: 访问码 = 使用额度，每码 N 次 grill session，服务端扣减，清 cookie 不重获额度
3. **访问码管理**: 管理员可批量生成码、查看用量、吊销码、设额度和过期时间
4. **过期时间**: 码可设 `expires_at`，比赛结束后自动失效
5. **Vercel 部署**: `vercel --prod` 部署 + 所有 env vars 配置
6. **自定义域名**: 绑定购买域名（避免 `.vercel.app` 被墙）
7. **Supabase 生产配置**: Auth providers (Magic Link / Google OAuth)、RLS 验证

## User Stories

* 作为评委，我收到带 `?code=xxx` 的链接，点击后直接可用
* 作为评委，我也可以在页面上手动输入码（码可能在 PDF/文档里）
* 作为评委，我不想注册账号，输入码就能用
* 作为评委，我的码有 30 次额度，用完为止
* 作为注册用户，我有自己 API key 时不需要输入码
* 作为管理员，我想批量生成 50 个评委码，每个 30 次额度
* 作为管理员，我想看到每个码的使用情况（已用次数、最后使用时间）
* 作为管理员，我想吊销一个码（码泄露时）
* 作为管理员，我想在比赛结束后让所有码自动失效

## Acceptance Criteria

* [ ] 访问码 Middleware 拦截未授权请求，返回验证页（码输入框）
* [ ] 带有效码的 URL 验证通过后设 cookie，7 天有效
* [ ] 页面内可手动输入码（不依赖 URL 参数）
* [ ] 已登录用户自动绕过访问码验证
* [ ] 无码或无效码 → 显示验证页（输入框 + 错误提示）
* [ ] 码额度服务端扣减：每次 grill API 调用 quota_used += 1
* [ ] 额度耗尽后返回友好提示（非 429，显示"额度已用完"）
* [ ] 码过期后自动拒绝
* [ ] 清除 cookie 后重新输入同一码 → 继续使用剩余额度（不是重新获得 30 次）
* [ ] 管理员页面 `/admin/codes`：批量生成、查看用量、吊销码
* [ ] 管理员认证：Supabase auth + `is_admin` 字段
* [ ] Vercel 部署成功 + 自定义域名可访问
* [ ] Supabase Auth 配置完成（Magic Link + Google）
* [ ] `pnpm typecheck` + `pnpm test` + `next build` 通过

## Definition of Done

* 新增 Supabase migration（access_codes 表 + profiles.is_admin 字段）
* 新增 Middleware 访问码校验逻辑（合并到现有 middleware，不替换）
* 新增验证页 `/verify` 组件（码输入框 + 错误提示 + 已登录提示）
* 新增 `/admin/codes` 页面 + 管理员 API（create / list / revoke）
* 新增 `/api/access-codes/verify` 端点
* 新增额度扣减逻辑（grill API 路由中）
* Vercel 部署配置 + 域名绑定 + env 同步
* 所有测试通过

## Technical Approach

### 访问码流程

```
评委浏览器 → Middleware
  → 已登录用户? → 直接放行
  → 有有效 cookie (access_code)? → 查 DB 码是否仍有效 → 有效则放行
  → 有 ?code=xxx? → 验证码 → 设 cookie → 放行
  → 无码? → 显示验证页（码输入框）
```

### 防刷机制（核心）

**码即额度**，不在客户端追踪：

```
每次 grill API 调用:
  1. Middleware 读 cookie 中的 code
  2. 查 DB: SELECT quota_used, quota_total, expires_at, revoked FROM access_codes WHERE code = ?
  3. 若 quota_used >= quota_total → 返回"额度已用完"
  4. 若 expired 或 revoked → 返回"码已失效"
  5. UPDATE access_codes SET quota_used = quota_used + 1, last_used_at = now() WHERE code = ?
  6. 放行
```

清 cookie 无效：因为额度在服务端扣减，重新输入同一码只会继续使用剩余额度。

### 访问码格式

`MG-JUDGE-<12随机字符>` (cryptographic, 不可猜测)

### 访问码表

```sql
access_codes (
  id uuid PK DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  quota_total int NOT NULL DEFAULT 30,
  quota_used int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  note text,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
)
-- 无 RLS：只有服务端路由和管理员可访问此表
-- 普通用户通过 API 输入码、cookie 验证，不直接读写此表
```

### 管理员认证

`profiles` 表增加 `is_admin boolean DEFAULT false`。`/admin/*` 路由检查 `is_admin`。

### Middleware 集成策略

现有 `src/middleware.ts` 已有 Supabase session 刷新逻辑（`updateSession()`）。新逻辑**合并**到现有 middleware，不替换：

```
middleware(request):
  1. 调用 updateSession()（刷新 Supabase auth cookie）
  2. 已登录用户? → 直接放行（不检查码）
  3. 请求 /api/keys/* / /api/auth/* → 放行（已有 auth 保护）
  4. 有有效 access_code cookie? → 查 DB 是否仍有效 → 有效则放行
  5. 有 ?code=xxx 参数? → 验证码 → 设 cookie → 重定向去掉 ?code 参数
  6. 无码? → 重定向到 /verify
```

### Cookie 安全

`access_code` cookie 设置：
- `HttpOnly`: 是（防 XSS 读取）
- `Secure`: 是（生产环境 HTTPS）
- `SameSite`: `Lax`（允许链接跳转携带）
- `Path`: `/`
- `Max-Age`: 7 天

### API 路由规划

| Method | Path | 功能 | 认证 |
|--------|------|------|------|
| POST | `/api/access-codes/verify` | 验证码并设 cookie | 无 |
| POST | `/api/access-codes/create` | 批量生成码 | admin |
| GET | `/api/access-codes` | 列出所有码（含用量） | admin |
| PATCH | `/api/access-codes/:id/revoke` | 吊销码 | admin |

grill API 路由（`/api/grill/start`、`/api/grill/answer`）在业务逻辑中检查码额度并扣减。

### 验证页

独立页面 `/verify`，包含：
- 码输入框（主要入口）
- 错误提示（码无效/过期/额度用完）
- 已登录用户提示（"您已登录，无需输入码"）
- 登录链接（"已有账号？登录后无需码"）

### 部署清单

1. 购买域名 → 配置 DNS (CNAME → cname.vercel-dns.com)
2. Vercel `vercel --prod` 首次部署
3. Vercel dashboard 设置环境变量
4. Vercel → Settings → Domains 添加自定义域名
5. Supabase dashboard → Authentication → 启用 Magic Link + Google OAuth
6. 生成首批访问码

## Decision (ADR-lite)

**Context**: 评委在中国校园网络环境下体验产品，需要零摩擦但防滥用。

**Decision**: 码即额度 — 访问码既是门控又是使用额度。输入码 → cookie 记住 → 服务端扣减。无需 Turnstile/IP限速/设备指纹，因为码本身限制了使用量。已登录用户（有自己 API key）自动绕过。

**Consequences**:
- ✅ 评委零摩擦：输入码即可使用，7 天免重新输入
- ✅ 防滥用：码额度耗尽即止，清 cookie 无效（额度在服务端）
- ✅ 简单：无需 Turnstile、IP 限速、设备指纹
- ✅ 可管理：管理员可吊销码、设额度、设过期时间
- ⚠️ 码泄露 = 额度被用完（但可吊销 + 有额度上限）
- ⚠️ 需要管理员手动生成和分发码

## Out of Scope

* 自动邀请码分发（邮件/短信）
* 支付/计费系统
* Turnstile / 人机验证（码本身是门控）
* IP 限速（码额度是天然限速）
* 设备指纹（清 cookie 无用，不需要指纹）
* 多语言管理后台
* VPS 反向代理方案
* 访问码的访问日志详细记录（只记录 quota_used 和 last_used_at）

## Technical Notes

* 现有 Middleware: `src/middleware.ts` + `src/lib/supabase/middleware.ts` — **必须合并**，不能替换
* 现有 Supabase client: `src/lib/supabase/server.ts`
* 现有 auth: `src/lib/auth/get-user.ts`
* Vercel Edge Middleware 可在 Edge Runtime 运行（需注意 Supabase client 兼容性）
* 码验证页为独立路由 `/verify`，Middleware 重定向到此页
* `.env.local` 已配置（Supabase URL/anon key/ENCRYPTION_KEY），Vercel 部署时需同步
* Supabase migrations 0001+0002 已推送到远程项目 `mindgrill`
* Cookie 安全属性：HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age=7d

* 现有 Middleware: `src/middleware.ts` + `src/lib/supabase/middleware.ts` — **必须合并**，不能替换
* 现有 Supabase client: `src/lib/supabase/server.ts`
* 现有 auth: `src/lib/auth/get-user.ts`
* Vercel Edge Middleware 可在 Edge Runtime 运行（需注意 Supabase client 兼容性）
* 码验证页为独立路由 `/verify`，Middleware 重定向到此页
* `.env.local` 已配置（Supabase URL/anon key/ENCRYPTION_KEY），Vercel 部署时需同步
* Supabase migrations 0001+0002 已推送到远程项目 `mindgrill`
* Cookie 安全属性：HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age=7d