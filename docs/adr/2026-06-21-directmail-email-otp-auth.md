# 阿里云邮件推送与 Better Auth 邮箱验证码

- 日期：2026-06-21
- 状态：已采纳（Accepted）

## Context

账号体系第一版需要尽快上线给学员注册使用。已确定的产品模型是：

- 注册：邮箱 + 验证码 + 密码。
- 登录：邮箱 + 密码，也支持 GitHub OAuth。
- 找回或更新密码：邮箱 + 验证码 + 新密码。

项目已经使用 Better Auth、Cloudflare Workers 和 D1。Better Auth 核心表包含 `user`、`session`、`account`、`verification`，适合继续保存验证码、账号和会话状态。

邮件服务已选阿里云邮件推送（DirectMail）。发信域名为 `mail.digitalleft.org`，DNS 已在 Cloudflare 配置并验证 DKIM、SPF、DMARC、MX。发信地址采用触发邮件类型的 `noreply@mail.digitalleft.org`。

阿里云控制台里还存在 API 网关产品，但邮件推送本身已经提供 OpenAPI。为一封验证码邮件再创建 API 网关会增加配置、鉴权和排障成本。

## Decision

验证码与账号状态交给 Better Auth，邮件发送交给阿里云 DirectMail。

Better Auth 接入方式：

- 保留 `emailAndPassword` 作为邮箱密码登录入口。
- 接入 `better-auth/plugins/email-otp` 作为验证码能力。
- 使用 `email-otp` 的注册邮箱验证和密码重置接口，不启用邮箱验证码登录作为第一版主登录方式。
- GitHub OAuth 继续作为并列登录方式；GitHub profile 的 name/image 可用于初始化昵称和头像。

验证码策略：

- 验证码长度为 6 位数字。
- 有效期设置为 10 分钟。
- 单个验证码默认最多尝试 3 次。
- 验证码在 D1 的 Better Auth `verification` 表中保存，优先使用 Better Auth 支持的安全存储方式。
- 重发策略优先保持简单：有效期内重发可复用同一验证码并延长过期时间；如安全存储方式不支持复用，则接受轮换新验证码。
- 发送、验证、重置密码接口必须保留限流，后续可按邮箱、IP 和 Cloudflare 请求来源继续收紧。

阿里云邮件发送方式：

- 不在阿里云 API 网关里创建 API。
- 不优先使用 SMTP，因为 Cloudflare Workers 运行时不适合普通 Node SMTP 客户端。
- 在 Worker 服务端通过 `fetch` 调用阿里云邮件推送 OpenAPI 发触发邮件。
- API 凭证只存为 Cloudflare Worker secrets，不进入仓库、Issue、日志或前端 bundle。
- 最小需要的运行时配置包括 AccessKey ID、AccessKey Secret、发信地址、发信人名称和 DirectMail 区域。

第一版邮件内容只发送验证码和必要上下文，不包含卡密、付费课程正文、论坛内容或其他受限资料。

## Consequences

- 阿里云 API 网关页面不属于本项目验证码链路；继续在邮件推送、RAM/访问控制和 Cloudflare secrets 里完成配置即可。
- Better Auth 继续拥有账号、会话和验证码生命周期，避免自建一套平行验证码表。
- Cloudflare Worker 只需要一个 DirectMail API 适配层，后续如果更换邮件服务商，影响面集中在发信适配层。
- 登录体验符合当前判断：日常登录用邮箱密码，验证码只用于注册验证和密码找回/更新。
- 需要后续实现 DirectMail API 签名、邮件模板、Better Auth `email-otp` 插件配置、前端注册/找回密码表单和用户中心资料页。
