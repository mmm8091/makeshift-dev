# 后端待接清单（交班给 Codex）

前端已搭好首页、课程阅读页、登录/注册壳；以下是等后端接线的部分。
技术细节见 `docs/草台编子识字班产品技术方案.md`，前端约定见 `docs/agents/frontend.md`，内容边界见 `docs/agents/collaboration.md`。

> 现状：当前仓库是纯前端（Next.js App Router）+ 少量 Node 服务端路由。
> 还**没有**接 Cloudflare 适配、D1、Drizzle、Better Auth —— 这些是这次交班的主要工作。

## 技术栈（已定）

Next.js on Cloudflare Workers（`@opennextjs/cloudflare`）、Cloudflare D1、Drizzle ORM、Better Auth。

## 1. 账号系统（Better Auth）

- 前端壳：`app/login/`、`app/register/`；表单组件在 `components/auth/`（`login-form.tsx`、`register-form.tsx`）。
- 登录：邮箱 + 密码 / GitHub OAuth。
- 注册字段：昵称、邮箱、**邮箱验证码**、密码、QQ 号（选填）。**注册不收 GitHub 用户名**。
- 表单当前 `onSubmit` 只弹"接入中"提示、"发送验证码"只走前端 60s 倒计时——等你接：
  - Better Auth 邮箱验证码（发送 + 校验）、密码注册/登录、GitHub OAuth、session。
- `profiles` 表建议：`display_name`、`qq_number`、`bio`、`role`。
  （方案里原有 `github_username`，现在注册不收了，是否保留/改为 OAuth 自动带入由你定。）

## 2. 卡密 / 权限

- 报名文章路由 `/courses/enroll`（正文 `content/courses/enroll.md` 待写）；章节栏里锁住的文章都跳这里。
- 待建：卡密兑换接口（**D1 原子条件更新防并发超发**，SQL 见方案「卡密系统」节）、`redeem_codes` / `redeem_code_uses` / `entitlements` 表、`/redeem` 页。

## 3. 付费课程正文（防泄漏是重点）

- 公开正文：仓库内 `content/courses/{slug}.md`。
- 付费正文：存 D1。**接入点是 `lib/content.ts` 的 seam** —— 在那里加一条分支：校验 session + entitlement → 从 D1 读 `body_md`；未解锁返回 `null`。
- 阅读页 `app/courses/[slug]/page.tsx` 已按"可读 = `public && available`"渲染，未解锁自动走 `Gate`（不渲染正文）。付费课接 D1 时，把"可读判定 + 正文来源"换成鉴权后的结果即可，UI 不用动。
- 文章清单在 `lib/courses.ts`（`COURSES` / `ARTICLES`）。

## 4. 已就绪（无需后端改动）

- QQ 头像代理：`app/api/avatar/qq/[qq]/route.ts`（无状态，直接用）。
- 学员墙数据：`data/students.json`（裸数组 `{qq, displayName}`，学员通过 PR 添加）、`data/team.json`。

## 5. 部署

- 目标 Cloudflare Workers + D1。需接 `@opennextjs/cloudflare`、`wrangler`、`drizzle-kit` 与迁移脚本（方案「部署流水线」节有 scripts 建议）。
- 环境变量见方案（`BETTER_AUTH_*`、`GITHUB_CLIENT_*`、`CLOUDFLARE_*`、`D1_DATABASE_ID`）。

## 必守边界

- 付费正文 / 受限论坛内容**不进公开仓库、不进前端 bundle、不进构建产物**；只能服务端鉴权后从 D1 读。
- 卡密只存 hash，不存明文。
- 兑换 / 注册 / 发帖接口要限流；Markdown 渲染要做 XSS 防护（付费正文从 D1 来，比仓库内的可信内容更需要）。
