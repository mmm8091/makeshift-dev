# 文档索引

本仓库文档分四类。**【必读】** 标记表示对应工作开始前应先读。版本与变更记录见仓库根的 [CHANGELOG.md](../CHANGELOG.md)。

## 长期文档（产品 / 边界 / 规格）

| 文档 | 作用 |
| --- | --- |
| [../CONTEXT.md](../CONTEXT.md) | 产品定位、公开/私密内容边界。**【任何产品改动必读】** |
| [草台编子识字班产品技术方案.md](草台编子识字班产品技术方案.md) | 产品与技术总方案。**【必读】** |
| [草台编子识字班插画美术规范.md](草台编子识字班插画美术规范.md) | 木刻美术规范。**【插画必读】** |
| [草台编子识字班论坛v1实现规格.md](草台编子识字班论坛v1实现规格.md) | 论坛 v1 实现规格。**【论坛必读】** |

## 架构决策（ADR · [adr/](adr/)）

按日期累加，记录"为什么这么定"。新决策何时该加见 [agents/domain.md](agents/domain.md)。

| ADR | 主题 |
| --- | --- |
| [2026-06-21 D1 与账号权限基础](adr/2026-06-21-cloudflare-d1-auth-foundation.md) | 数据库分层、entitlement 模式。**【论坛必读】** |
| [2026-06-21 暖纸墨绿 UI 方向](adr/2026-06-21-warm-paper-green-ui-direction.md) | 视觉基调 |
| [2026-06-21 Cloudflare 自定义域入口](adr/2026-06-21-cloudflare-custom-domain-entrypoint.md) | 部署入口 |
| [2026-06-21 DirectMail 邮箱 OTP](adr/2026-06-21-directmail-email-otp-auth.md) | 邮件发送决策 |
| [2026-06-23 论坛与 Agent 接入模型](adr/2026-06-23-forum-and-agent-access-model.md) | 单一服务层 + 卡密门禁 + MCP。**【论坛必读】** |

## Agent 工作规则（[agents/](agents/)）

| 文档 | 作用 |
| --- | --- |
| [domain.md](agents/domain.md) | 如何消费领域文档、何时加 ADR |
| [issue-tracker.md](agents/issue-tracker.md) | issue / 外部 PR 三角化 |
| [triage-labels.md](agents/triage-labels.md) | 标签词表 |
| [collaboration.md](agents/collaboration.md) | 协作约定 |
| [frontend.md](agents/frontend.md) | 前端与内容的已落地约定。**【前端必读】** |
| [course-content.md](agents/course-content.md) | 课程内容导入与公开/私密边界。**【内容必读】** |
| [backend-handoff.md](agents/backend-handoff.md) | 后端 / 部署当前状态、生产入口、验证命令、已知缺口（**活文档**，随版本更新） |

## 归档（[archive/](archive/)）

完成使命或被取代的文档，保留备查、不再维护。当前已归档：首页内容与素材需求（首页已填好上线）。

---

## 论坛 v1 开发前必读

按顺序：

1. [../CONTEXT.md](../CONTEXT.md) — 公开/私密边界
2. [adr/2026-06-23-forum-and-agent-access-model.md](adr/2026-06-23-forum-and-agent-access-model.md) — 论坛/Agent 接入决策
3. [草台编子识字班论坛v1实现规格.md](草台编子识字班论坛v1实现规格.md) — 实现规格
4. [adr/2026-06-21-cloudflare-d1-auth-foundation.md](adr/2026-06-21-cloudflare-d1-auth-foundation.md) — 论坛复用的 entitlement 模式
5. [agents/backend-handoff.md](agents/backend-handoff.md) — auth / entitlement / profiles 已就位，是论坛前置
6. [agents/frontend.md](agents/frontend.md) — 前端约定
7. [agents/course-content.md](agents/course-content.md) — 公开/私密边界细则

## 维护约定

- 发布里程碑与变更 → [CHANGELOG.md](../CHANGELOG.md)；内容贡献不计入版本号。
- 新架构决策 → [adr/](adr/)（触发条件见 [agents/domain.md](agents/domain.md)）。
- `backend-handoff.md` 是活文档：已完成的工作归入 CHANGELOG，不在 handoff 里重复堆积。
