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
| 课程正文读取 / 导入 | `lib/content.ts`、`app/courses/[slug]/page.tsx`、`app/courses/page.tsx`、`scripts/import-course-section.mjs` |

要点提醒：

- 付费正文从 D1 `course_sections.body_md` 读取，`visibility = locked` 时服务端检查 session + 有效 `entitlements.scope`；`/courses` 读元数据但不查 `body_md`。
- 当前正式 entitlement scope 为 `course:full`。
- 顶栏登录态**刻意走客户端 `useSession`**，以保留首页 / 课程页的静态渲染。
- 本地待导入付费正文放 `课程文档/`（已 `.gitignore`），导入用 `pnpm course:import -- --remote ...`，详见 [course-content.md](course-content.md)。

## 管理员账号

当前生产 D1 只有 owner 一个真实账号，已设 `profiles.role = 'admin'`。不要把真实邮箱、用户 ID 或卡密明文写进仓库文档。

需要复查时：

```powershell
pnpm wrangler d1 execute makeshift-dev --remote --command "select email,name,emailVerified from user; select display_name,role from profiles;"
```

## 仍未完成

- 论坛尚未实现（**已出 v1 规格**，见 [docs/README.md](../README.md) 的"论坛 v1 开发前必读"）。
- 前端缺口：顶栏「论坛」指向 `/forum` 但路由未实现（点击 404）；首页 / 顶栏 / 课程 Gate 指向 `/courses/enroll`，但报名正文未写（`ENROLL.available=false`，点进去是「待上传」占位）；课程介绍页（非文章 landing）仍待做。
- 兑换、注册、登录、发信接口需要更细的限流与机器人防护。
- 管理后台只有生成卡密，缺批次列表、禁用、使用记录查询。
- DirectMail 发送日志当前用于排障，后续可收敛成更少的结构化日志。

## 下一步建议

优先级从高到低：

1. 做论坛 v1：**分前后端两轮、前端先行**（见 [collaboration.md](collaboration.md) 执行节奏 + [论坛 v1 规格](../草台编子识字班论坛v1实现规格.md) §8）。当前 auth / entitlement / profiles 已就位，是论坛前置。
2. 补管理员卡密列表：按 `batch_id`、`scope`、使用次数、过期时间展示，支持禁用未发出的批次。
3. 增加基础限流：至少覆盖注册、验证码发送、登录、卡密兑换、管理员生成卡密。
4. 课程内容操作下一层便利：可选 frontmatter 解析、批量导入、导入前预览 diff。

## 验证命令

```powershell
pnpm typecheck
pnpm build
gh run list --repo mmm8091/makeshift-dev --limit 3
pnpm wrangler d1 execute makeshift-dev --remote --command "select count(*) from user;"
```

## 交接提醒

- 不要提交付费课程正文、论坛私密内容、卡密明文，以及 Cloudflare / 阿里云 / GitHub secrets、数据库导出。
- Codex 写的提交使用 `Codex <codex@openai.com>` 作为 author。
- 学员 PR 是课程现场的一部分，审核时保持具体、友好、可执行。
