# 后端状态

更新时间：2026-06-23

这份是**活文档**（长期状态，非会话交接；会话交接按 handoff 技能放 OS 临时目录），记录后端 / 部署 / 权限系统的当前运维状态、关键文件地图与已知缺口。
**已完成的功能与里程碑见 [CHANGELOG.md](../../CHANGELOG.md)，不在此重复堆积。**
更长期的架构决策见 [docs/adr/](../adr/)，前端约定见 [frontend.md](frontend.md)，课程内容导入约定见 [course-content.md](course-content.md)，产品边界见 [CONTEXT.md](../../CONTEXT.md) 与 [产品技术方案](../草台编子识字班产品技术方案.md)。

## 当前生产入口

- 生产站点：`https://makeshift-dev.digitalleft.org`
- Cloudflare Worker：`makeshift-dev`
- D1 database：`makeshift-dev`，binding `DB`
- 自动部署：`.github/workflows/deploy-cloudflare.yml`（push `main`）
- 发版：`.github/workflows/release.yml`（push `v*` 标签自动建 GitHub Release，详见 [CHANGELOG.md](../../CHANGELOG.md) 流程）

`main` 分支 push 后在 GitHub Actions 执行：

1. `pnpm typecheck`
2. `pnpm db:migrate:remote`
3. `pnpm run deploy`

Cloudflare Worker secrets 已在控制台配置，不要写入仓库或日志。非敏感运行时变量在 `wrangler.jsonc`。

## 关键文件地图

已落地能力对应的主要文件（功能说明见 CHANGELOG）：

| 领域 | 主要文件 |
| --- | --- |
| 账号 / 会话 / OAuth | `lib/auth.ts`、`lib/auth-client.ts`、`app/api/auth/[...all]/route.ts`、`components/auth/` |
| 邮件验证码（DirectMail） | `lib/email/directmail.ts`、`lib/email/auth-email.ts` |
| 用户资料 / 用户中心 | `app/me/page.tsx`、`app/api/me/route.ts`、`components/me/user-center.tsx`、`app/api/avatar/qq/[qq]/route.ts` |
| 顶栏登录态 | `components/header-auth.tsx`、`components/site-header.tsx` |
| 卡密与权益 | `lib/redeem-codes.ts`、`app/api/admin/redeem-codes/route.ts`、`app/admin/redeem-codes/page.tsx`、`components/admin/redeem-code-admin.tsx`、`app/api/redeem/route.ts` |
| 限流 | `lib/rate-limit.ts`、`db/schema.ts` 的 `rate_limits`、`drizzle/migrations/0004_rate_limits.sql` |
| MCP / 外部 API | `docs/adr/2026-06-23-mcp-api-token-auth.md`、`docs/草台编子识字班-agent-access-v0.3技术方案.md`、`lib/agent-access-tokens.ts`、`app/api/me/agent-tokens/route.ts`、`app/api/mcp/route.ts`、`db/schema.ts` 的 `agent_access_tokens` / `agent_access_audit_logs`、`drizzle/migrations/0005_agent_access_tokens.sql` |
| 课程正文读取 / 导入 | `lib/content.ts`、`app/courses/[slug]/page.tsx`、`app/courses/page.tsx`、`scripts/import-course-section.mjs` |
| 论坛 v1 | `lib/forum.ts`、`lib/forum-types.ts`、`app/forum/`、`components/forum/`、`app/admin/forum-tags/`、`components/admin/forum-tag-admin-panel.tsx`、`drizzle/migrations/0002_seed_forum_tags.sql`、`drizzle/migrations/0003_forum_tag_visibility.sql` |

要点提醒：

- 付费正文从 D1 `course_sections.body_md` 读取，`visibility = locked` 时服务端检查 session + 有效 `entitlements.scope`；`/courses` 读元数据但不查 `body_md`。
- 当前正式学员通行证 scope 为 `course:full`；它解锁课程、论坛、MCP 与外部 API 的学员能力。能力层同时预留 `forum:access`、`mcp:read` / `mcp:write`、`api:read` / `api:write`，用于后续更细授权，但不能让既有 `course:full` 学员掉权限。
- MCP / 外部 API 使用用户授权的 Agent 访问令牌：token scope 只是调用上限，实际权限仍实时取用户有效 entitlement / capability；令牌只存 peppered hash，审计日志只存元数据。生产环境需配置 `AGENT_ACCESS_TOKEN_PEPPER` secret。
- `/api/mcp` 已开放首版工具：基础自检、whoami、entitlement 自查、课程章节表、按 slug 读单篇课程、论坛列表 / 详情、论坛发帖 / 回帖、管理员审计 / token / 用户排障。课程正文不支持批量导出，论坛写入复用 `lib/forum.ts`。
- 论坛 v1：`lib/forum.ts` 负责 session、profiles、entitlement、D1 读写、slug、发帖/回帖限流、作者/管理员授权、软删除与恢复；`/forum` 顶栏入口已恢复。
- 论坛默认标签 migration 已在远端 D1 执行：`homework` / `ask` / `share` / `pitfall`。管理员可在 `/admin/forum-tags` 新增、改名、隐藏/恢复标签；学员只能选择未隐藏标签。
- 远端论坛已有发布公告首帖；受限论坛正文仍不做仓库备份。
- 安全限流使用 D1 `rate_limits` 表：认证 POST、验证码相关、兑换、卡密管理、论坛写操作都已接入；key 只存 hash，不存 IP / 邮箱 / 卡密明文。
- 卡密后台支持生成、批次列表、按批次 + scope 禁用剩余卡密；明文仍只在生成结果里显示一次。
- DirectMail 成功发送不再逐封打日志；失败日志只保留类型、错误码、requestId、状态码等排障字段。
- 顶栏登录态**刻意走客户端 `useSession`**，以保留首页 / 课程页的静态渲染。
- 本地待导入付费正文放 `课程文档/`（已 `.gitignore`），导入用 `pnpm course:import -- --remote ...`，详见 [course-content.md](course-content.md)。

## 管理员账号

当前生产 D1 只有 owner 一个真实账号，已设 `profiles.role = 'admin'`。不要把真实邮箱、用户 ID 或卡密明文写进仓库文档。

需要复查时：

```powershell
pnpm wrangler d1 execute makeshift-dev --remote --command "select email,name,emailVerified from user; select display_name,role from profiles;"
```

## 仍未完成

- 论坛还缺作业示例、提问模板等运营内容；不要把受限论坛正文备份提交进仓库。
- 论坛后续可补更细的管理能力：评论隐藏 / 删除、管理员列表页、用户禁言或更长窗口限流。
- 前端缺口：首页 / 顶栏 / 课程 Gate 指向 `/courses/enroll`，但报名正文未写（`ENROLL.available=false`，点进去是「待上传」占位）；课程介绍页（非文章 landing）仍待做。
- 后续仍可加 Turnstile、人机验证、管理员用户列表与更细审计。
- 卡密后台仍缺单张卡查询、使用记录详情与撤销/调整已发权益。
- MCP / 外部 API 还缺用户侧 token 管理 UI；窄 REST adapter 暂未做，当前入口是 `/api/mcp`。

## 下一步建议

优先级从高到低：

1. 由管理员补作业分享引导 / 提问模板，并做学员 / 管理员两视角 smoke test。
2. 补用户侧 Agent token 管理 UI，让学员能在 `/me` 或 `/me/agent-tokens` 创建、复制一次、撤销 token。
3. 上线前在 Cloudflare Worker secrets 配置 `AGENT_ACCESS_TOKEN_PEPPER`，并做真实 token smoke test。
4. 补管理员卡密使用记录详情，支持排查某批次兑换情况。
5. 课程内容操作下一层便利：可选 frontmatter 解析、批量导入、导入前预览 diff。

## 验证命令

```powershell
pnpm typecheck
pnpm build
gh run list --repo mmm8091/makeshift-dev --limit 3
pnpm wrangler d1 execute makeshift-dev --remote --command "select count(*) from user;"
pnpm wrangler d1 execute makeshift-dev --remote --command "select count(*) from forum_posts; select slug,name,hidden_at from forum_tags;"
pnpm wrangler d1 execute makeshift-dev --remote --command "select namespace,count(*) from rate_limits group by namespace;"
pnpm wrangler d1 execute makeshift-dev --remote --command "select name from sqlite_master where type='table' and name in ('agent_access_tokens','agent_access_audit_logs');"
```

## 交接提醒

- 不要提交付费课程正文、论坛私密内容、卡密明文，以及 Cloudflare / 阿里云 / GitHub secrets、数据库导出。
- Codex 写的提交使用 `Codex <codex@openai.com>` 作为 author。
- 学员 PR 是课程现场的一部分，审核时保持具体、友好、可执行。
