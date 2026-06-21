# Cloudflare D1 与账号权限基础结构

- 日期：2026-06-21
- 状态：已采纳（Accepted）

## Context

项目第一版需要账号、卡密解锁、付费课程正文和极简论坛。公开仓库不能包含付费课程正文、受限论坛正文、卡密明文、私密导出或数据库备份。

前端已经把公开课程正文读取留在 `lib/content.ts`，并约定付费正文未来从 D1 服务端鉴权后读取。注册表单也已改为昵称、邮箱验证码、密码、QQ 号选填，不再收集 GitHub 用户名。

## Decision

部署目标采用 `@opennextjs/cloudflare` 到 Cloudflare Workers，D1 binding 名为 `DB`，迁移目录为 `drizzle/migrations`。

数据库结构分两层：

- Better Auth 核心表保持默认模型与字段名：`user`、`session`、`account`、`verification`。
- 草台业务表使用 snake_case：`profiles`、`redeem_codes`、`redeem_code_uses`、`entitlements`、`course_sections`、`course_assets`、`forum_posts`、`forum_comments`、`forum_tags`、`forum_post_tags`。

`profiles.github_username` 保留为可选字段，但只允许由 GitHub OAuth profile 自动带入，不由注册表单收集。

卡密兑换表只存 `code_hash`，不存明文卡密。并发防超发仍以单条 `UPDATE redeem_codes SET used_count = used_count + 1 WHERE ... used_count < max_uses ...` 为业务实现要求。

邮箱验证码发送服务商暂未决策，先不把 Resend、SES、SendGrid 或 Better Auth Infra 写入架构。

## Consequences

- Auth 库表与业务资料表解耦，后续资料页、论坛和权限逻辑不会被 Better Auth 的核心 schema 绑死。
- D1 migration 可以本地执行并进入版本管理，远程 `database_id` 由部署前在 `wrangler.jsonc` 中替换。
- 付费正文表已经有 `body_md` 字段，但不得写入公开仓库、静态产物或迁移 seed。
- 账号表单接真实邮箱 OTP 前，必须先决定邮件发送服务和失败/限流策略。
