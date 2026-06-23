# 更新日志

记录「草台编子识字班」的发布里程碑与重要变更。

版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)，按"应用"而非"库"宽松理解：

- 版本号只标记**软件**发布里程碑；
- **内容贡献**（学员墙、骚话库、课程资产等）走 git / PR 流动，不计入版本号，贡献者也无需改动版本文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [未发布]

## [0.3.1] - 2026-06-23

### 修复

- 将 MCP 对外工具名改为 Codex 兼容的下划线格式，例如 `course_list_metadata`；保留原点号工具名作为兼容别名。

## [0.3.0] - 2026-06-23

Agent 接入首版：让学员可以把自己的课程和论坛权限授权给 Agent，用 MCP 读文章、读论坛、发帖和回帖。

### 安全与后台

- 新增 D1 `rate_limits` 表与共享限流 helper，覆盖认证 POST、验证码、兑换、资料更新、论坛写操作和卡密后台。
- 卡密后台新增批次列表，支持按批次 + scope 禁用剩余卡密。
- 权益能力层预留 `forum:access`、`mcp:read` / `mcp:write`、`api:read` / `api:write` 独立 scope，同时明确 `course:full` 是学员通行证，可覆盖课程、论坛、MCP 与外部 API 能力。
- 新增 MCP / 外部 API 鉴权 ADR 与 D1 表设计：用户授权 Agent 访问令牌、token hash 存储、撤销 / 过期字段与元数据审计日志。
- 新增 Agent 访问令牌服务层与 `/api/me/agent-tokens` 后端接口：支持创建、列表、撤销，token 明文只在创建时返回一次。
- 新增 `/me/agent-tokens` 用户侧管理页，可创建、复制一次性明文、查看和撤销 Agent 访问令牌。
- 新增 `/api/mcp` 工具入口：支持课程章节表、单篇课程读取、论坛列表 / 详情、论坛发帖 / 回帖、基础自检与管理员排障工具，所有受保护工具均走 Bearer token + 实时 entitlement 门禁。
- MCP 论坛写入复用 `lib/forum.ts`，课程读取保持“章节表一次返回、正文按 slug 单篇读取”，不提供全课程正文批量导出。
- DirectMail 日志收敛：成功发送不再逐封打日志，失败日志只保留错误码、requestId、状态码等排障字段。

## [0.2.0] - 2026-06-23

论坛 v1 上线版：把课程社区从“能读课”推进到“能在工棚里交作业、问问题、发公告、做基本管理”的阶段。

### 论坛

- 新增 `/forum`、`/forum/new`、`/forum/t/[slug]`、`/forum/tag/[tag]` 主链路。
- 论坛读写接入真实 session、`course:full` entitlement、D1、slug 生成、发帖 / 回帖限流与软删除。
- 发帖、编辑帖、回帖、编辑回复走 Server Action，错误可回显到表单。
- 论坛正文使用 Markdown 渲染，保留 `remark-gfm`，不启用原始 HTML 渲染。
- 列表只展示纯文本摘要，不把完整受限正文放进列表 payload。
- 顶栏恢复「论坛」入口，未解锁用户进入论坛时渲染解锁引导。

### 标签与管理

- 新增 `/admin/forum-tags`：管理员可新增、改名、隐藏 / 恢复标签。
- 学员发帖时只能选择未隐藏标签；公开帖子也不展示已隐藏标签。
- 管理员可置顶、隐藏、删除帖子；删除与隐藏均为软删除。
- 论坛页新增管理员「管理视图」：列出已隐藏 / 已删除帖子，并支持恢复公开。
- 详情页管理条补齐下架帖的恢复能力。

### 修复与上线打磨

- 修复 `/forum/new` 提交时因 `"use server"` 文件导出普通对象导致的线上 server action 500。
- 修复论坛读路径不必要写 D1 的问题，避免 GET 页面触发写操作。
- 修复已删除帖子仍出现在普通论坛列表的问题。
- 写入第一条发布公告帖，论坛具备真实线上内容入口。

### 文档与基础设施

- 新增并更新论坛 v1 实现规格，记录管理视图与 `restore` 管理动作。
- 新增论坛默认标签与标签可见性 D1 迁移。
- 更新后台状态文档，继续把受限论坛正文排除在公开仓库之外。

## [0.1.0] - 2026-06-23

首个里程碑：把「草台编子识字班」从零搭成一个可注册、可登录、可卡密解锁、可读课程的课程社区雏形——完成首讲内容、暖纸墨绿木刻视觉与骚话加载体验，并跑通 Cloudflare 自动部署。

### 站点与课程阅读

- Next.js 前端骨架与首页（Hero、宣言带、课程目录、学员墙、报名 CTA）。
- 课程阅读页与章节导航抽屉；第一讲 1.1–1.5 归组，锁定小节带锁图标显示。
- 课程页眉标仅显示「公开免费 / 报名解锁」，不暴露课时编号。
- 公开前言与首课《树立一个意志》上线。

### 账号与登录

- Better Auth 接入 Cloudflare Workers + D1。
- 邮箱注册 / 登录（邮箱 + 密码 + 验证码），未验证邮箱不可登录。
- 邮箱验证码找回 / 更新密码。
- GitHub OAuth 登录。
- 阿里云 DirectMail 发送验证码邮件（OpenAPI，非 SMTP；DKIM / SPF / DMARC 已配置验证）。

### 卡密与权益

- 管理员在 `/admin/redeem-codes` 生成卡密，明文只在生成页显示一次。
- 卡密只存 peppered hash，不存明文。
- 用户在 `/me` 兑换，成功写入 `entitlements`，正式 scope 为 `course:full`。
- 条件 `UPDATE` 抢占使用次数 + 唯一索引防止同一用户重复兑换同一张卡。

### 用户中心

- `/me` 用户中心：编辑昵称 / QQ 号 / 简介，登录后跳转。
- QQ 头像优先（短缓存代理腾讯头像源），其次 GitHub 头像，最后昵称首字。
- 顶栏登录态入口（客户端 `useSession`，以保留首页 / 课程页的静态渲染）。

### 内容、渲染与工作流

- 付费正文存 D1 `course_sections.body_md`，`visibility = locked` 时服务端校验 session + 有效 entitlement。
- 课程 Markdown 导入脚本 `pnpm course:import`（按 slug upsert 进 D1）。
- 导入前 Markdown 体检 `pnpm course:lint`（抓飞书转义 URL、裸 URL 等风险写法）。
- KaTeX 数学公式渲染。

### 美术与插画

- Logo「野草长成电路」与暖纸墨绿木刻设计系统（设计 token、`print-block`、`kicker`、`misprint` 等）。
- 第一讲分节插画与锁定小节梗图资产。

### 加载体验

- 课程文章「骚话加载页」：随机骚话 + 盖章动画，进文章后同一句留作题记，全程视觉连贯。
- 最短展示约 800ms 防一闪而过（软跳转补时，硬刷新不补）。
- 同一浏览器抽取不放回，一轮抽完全部骚话再放回。
- 骚话库 [data/quotes.json](data/quotes.json)，带「提 PR 投稿」钩子。

### 工程、部署与基础设施

- `@opennextjs/cloudflare` 部署到 Cloudflare Workers，自定义域 `makeshift-dev.digitalleft.org`。
- GitHub Actions 自动部署：`typecheck` → 远程 D1 迁移 → `deploy`。
- Drizzle ORM + Cloudflare D1，迁移纳入版本管理。

### 文档与架构决策

- ADR：D1 与账号基础、暖纸墨绿 UI 方向、Cloudflare 自定义域入口、DirectMail 邮箱 OTP、论坛与 Agent 接入模型。
- 产品技术方案、插画美术规范、论坛 v1 实现规格，以及协作 / 触发标签 / 领域等 agent 工作规则。

[未发布]: https://github.com/mmm8091/makeshift-dev/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/mmm8091/makeshift-dev/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mmm8091/makeshift-dev/releases/tag/v0.1.0
