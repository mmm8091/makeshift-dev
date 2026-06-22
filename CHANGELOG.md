# 更新日志

记录「草台编子识字班」的发布里程碑与重要变更。

版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)，按"应用"而非"库"宽松理解：

- 版本号只标记**软件**发布里程碑；
- **内容贡献**（学员墙、骚话库、课程资产等）走 git / PR 流动，不计入版本号，贡献者也无需改动版本文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [未发布]

下一版（论坛 v1）开发中。开发前必读见 [docs/README.md](docs/README.md) 的"论坛 v1 开发前必读"。

已知缺口（详见 [docs/agents/backend-handoff.md](docs/agents/backend-handoff.md)）：

- `/forum` 路由未实现，顶栏「论坛」点击 404。
- `/courses/enroll` 报名正文未写，课程 Gate 指向它，当前为占位。
- 注册 / 验证码 / 登录 / 兑换接口缺更细的限流与机器人防护。
- 管理后台仅能生成卡密，缺批次列表、禁用、使用记录查询。

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

[未发布]: https://github.com/mmm8091/makeshift-dev/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mmm8091/makeshift-dev/releases/tag/v0.1.0
