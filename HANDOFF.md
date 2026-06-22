# 换手 · 2026-06-23

给下一轮 agent 的起点。本文件是**薄指针**，细节以所链文档为准；过期可删。

## 当前状态

- 版本 **v0.1.0** 已发布并打标签；生产 `https://makeshift-dev.digitalleft.org`，push `main` 自动部署。
- 本轮新增：骚话加载页（最短防闪 + 抽取不放回）、论坛 ADR + v1 规格、CHANGELOG + 文档索引、归档目录、页脚版本号、push `v*` 标签自动建 Release 的工作流。
- 工作区干净，`main` 与 `origin/main` 同步。

## 下一步：论坛 v1（已规划好，未动工）

**执行约定（本轮新立的规矩）**：feature 的前端与后端**分属不同 agent 轮次**，经 `lib/forum.ts` 类型契约对接；**前端先行**。见 [docs/agents/collaboration.md](docs/agents/collaboration.md) 执行节奏。

- 第 1 轮（前端）：对着规格 §4 的类型签名 + fixture stub 把 `/forum` 系列 UI 做齐并定稿契约；**生产先不挂 `/forum` 入口**。
- 第 2 轮（后端）：实现真 `lib/forum.ts`（entitlement 门禁、D1、Server Action、限流、软删除），替换 stub，再开入口。

**开工前必读**：[docs/README.md](docs/README.md) 的"论坛 v1 开发前必读"清单（CONTEXT、论坛 ADR、v1 规格、D1/auth ADR、handoff、frontend、course-content）。

## 其他待办

后端已知缺口与优先级见 [docs/agents/backend-handoff.md](docs/agents/backend-handoff.md)（报名页 `/courses/enroll` 未写、接口限流、卡密批次管理等）。

## 发版流程提醒

改 CHANGELOG + bump `package.json` 版本（提交）→ `git tag vX.Y.Z` → `git push --follow-tags`，Release 由工作流自动建。内容贡献（学员墙 / 骚话库）不计入版本号。
