# 后端交接状态

更新时间：2026-06-22

这份文档记录当前后端、部署和权限系统的实际落地状态。更长期的架构决策见 `docs/adr/`，前端约定见 `docs/agents/frontend.md`，产品边界见 `CONTEXT.md` 和 `docs/草台编子识字班产品技术方案.md`。

## 当前生产入口

- 生产站点：`https://makeshift-dev.digitalleft.org`
- Cloudflare Worker：`makeshift-dev`
- D1 database：`makeshift-dev`
- D1 binding：`DB`
- 自动部署：`.github/workflows/deploy-cloudflare.yml`

`main` 分支 push 后会在 GitHub Actions 中执行：

1. `pnpm typecheck`
2. `pnpm db:migrate:remote`
3. `pnpm run deploy`

Cloudflare Worker secrets 已在控制台配置，不要写入仓库或日志。非敏感运行时变量在 `wrangler.jsonc`。

## 已完成

### 账号与会话

- Better Auth 已接入 Cloudflare Workers + D1。
- 邮箱注册：邮箱 + 密码 + 邮箱验证码。
- 邮箱登录：邮箱 + 密码；未验证邮箱不允许登录。
- 找回/更新密码：邮箱验证码 + 新密码。
- GitHub OAuth 已接入；OAuth 回调地址应保持为：

```txt
https://makeshift-dev.digitalleft.org/api/auth/callback/github
```

主要文件：

- `lib/auth.ts`
- `lib/auth-client.ts`
- `app/api/auth/[...all]/route.ts`
- `components/auth/`

### 邮件验证码

- 邮件服务商：阿里云邮件推送 DirectMail。
- 发信域名：`mail.digitalleft.org`
- 发信地址：`noreply@mail.digitalleft.org`
- Worker 通过 DirectMail OpenAPI 发验证码邮件，不使用 SMTP。
- DKIM、SPF、DMARC、MX 已在 Cloudflare DNS 配置并通过阿里云验证。

主要文件：

- `lib/email/directmail.ts`
- `lib/email/auth-email.ts`
- `docs/adr/2026-06-21-directmail-email-otp-auth.md`

### 用户资料与用户中心

- `/me` 已上线。
- 登录成功后跳转 `/me`。
- 用户可编辑昵称、QQ 号、简介。
- QQ 头像优先，其次 GitHub image，最后显示昵称首字。
- `admin` 用户会在用户中心看到卡密管理入口。

主要文件：

- `app/me/page.tsx`
- `app/api/me/route.ts`
- `components/me/user-center.tsx`
- `app/api/avatar/qq/[qq]/route.ts`

### 卡密与权益

- 卡密只存 peppered hash，不存明文。
- 管理员可在 `/admin/redeem-codes` 生成卡密。
- 明文卡密只在生成后的浏览器页面显示一次。
- 用户可在 `/me` 兑换卡密。
- 兑换成功会写入 `entitlements`，当前正式 scope 为 `course:full`。
- 兑换接口使用条件 `UPDATE` 抢占使用次数，并有唯一索引防止同一用户重复兑换同一张卡。

主要文件：

- `lib/redeem-codes.ts`
- `app/api/admin/redeem-codes/route.ts`
- `app/admin/redeem-codes/page.tsx`
- `components/admin/redeem-code-admin.tsx`
- `app/api/redeem/route.ts`
- `drizzle/migrations/0001_numerous_warbird.sql`

生产已人工验证：管理员生成卡密后，用户兑换显示 `已解锁：course:full`。

### 管理员账号

当前生产 D1 里只有 owner 的一个真实账号，并已设置为 `profiles.role = 'admin'`。不要把真实邮箱、用户 ID 或卡密明文写进仓库文档。

如果以后需要再次检查：

```powershell
pnpm wrangler d1 execute makeshift-dev --remote --command "select email,name,emailVerified from user; select display_name,role from profiles;"
```

## 仍未完成

- 付费课程正文从 D1 读取还没接到 `lib/content.ts`。
- `/courses/**` 目前仍按公开 Markdown 和前端 gate 展示；正式付费正文不得进入 `content/courses/`。
- 论坛还未实现。
- 兑换、注册、登录、发信接口需要更细的限流和机器人防护。
- 管理后台目前只有生成卡密，没有卡密批次列表、禁用、使用记录查询。
- DirectMail 发送成功/失败日志现在用于上线排障，后续可收敛成更少的结构化日志。
- GitHub Actions 有 Node 20 deprecation annotation，当前 workflow 已用 Node 22，后续如 action 仍提示，可升级相关 action 版本。

## 下一步建议

优先级从高到低：

1. 给课程读取层接 D1 付费正文：从 `lib/content.ts` 开始，服务端检查 session + `entitlements.scope` 后读取 `course_sections.body_md`。
2. 补管理员卡密列表：按 `batch_id`、`scope`、使用次数、过期时间展示，支持禁用未发出的批次。
3. 增加基础限流：至少覆盖注册、验证码发送、登录、卡密兑换、管理员生成卡密。
4. 做论坛最小闭环：列表、发帖、回帖、entitlement 保护。

## 验证命令

本地常用：

```powershell
pnpm typecheck
pnpm build
```

远端部署状态：

```powershell
gh run list --repo mmm8091/makeshift-dev --limit 3
```

远端 D1：

```powershell
pnpm wrangler d1 execute makeshift-dev --remote --command "select count(*) from user;"
```

## 交接提醒

- 不要提交付费课程正文、论坛私密内容、卡密明文、Cloudflare/阿里云/GitHub secrets、数据库导出。
- Codex 写的提交使用 `Codex <codex@openai.com>` 作为 author。
- 学员 PR 是课程现场的一部分，审核时保持具体、友好、可执行。
