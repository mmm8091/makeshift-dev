# 论坛与 Agent 接入模型：单一服务层 + 卡密 entitlement 门禁

- 日期：2026-06-23
- 状态：已采纳（Accepted）

## Context

论坛是路线图第 3 阶段，表结构（`forum_posts`、`forum_comments`、`forum_tags`、`forum_post_tags`）已在 D1 中就位，权限上与课程一致：未解锁（无有效 entitlement）用户不可访问。受限论坛正文不得进入公开仓库，必须服务端鉴权后读取与渲染（见 `CONTEXT.md` 与 [2026-06-21-cloudflare-d1-auth-foundation](2026-06-21-cloudflare-d1-auth-foundation.md)）。

本项目的立身是"教普通人用 AI / Agent 完成真实创造"，学员 PR 是课程的一部分。因此除了论坛本体，还需要现在就决定：**要不要对 Agent / 外部系统留接口、留成什么形态**，避免日后为了开接口重写鉴权逻辑、或意外绕过卡密泄漏付费内容。

既有服务端取数与鉴权模式已经成型（`lib/content.ts`）：`getDb(env)` 取 D1，`createAuth(env).api.getSession({ headers })` 取会话，entitlement 以 `scope + starts_at <= now + (expires_at IS NULL OR > now)` 判定，课程默认 scope 为 `DEFAULT_COURSE_ENTITLEMENT = "course:full"`。

## Decision

1. **论坛 v1 自研**，落在 Next 之上：读用 Server Component 直连 D1，写用 Server Action。不为前端 UI 另开一套公开 REST API（付费内容必须服务端鉴权，不允许纯前端隐藏）。

2. **所有论坛能力收进单一服务层 `lib/forum.ts`**。每个函数都接收一个"已鉴权的访问者上下文"，**session 校验、entitlement 判定、作者/管理员授权、限流、软删除只活在这一层**。UI 现在调它；将来的 MCP server 或对外 REST 调用**同一批函数**。接口形态的决策因此被延后且廉价——只是在服务层之上加一个薄适配器，永远不会出现两套权限逻辑。

3. **entitlement 采用“能力 → scope 列表”的映射**，由服务层持有。`course:full` 继续是当前课程通行证，并兼容解锁论坛与 MCP 读取；同时预留独立 scope：`forum:access`（论坛）、`mcp:read`（MCP 读取）、`api:read`（外部 API 读取）。外部 API 默认不由 `course:full` 自动解锁，避免把站内学习权益误扩成对外集成权限。

4. **MCP server 是一等的、卡密 entitlement 门禁功能**，与课程、论坛同级，规划为后续阶段。它按用户鉴权（scoped token / OAuth），内部调用同一套 `lib/forum.ts` 与课程内容服务层，强制与 UI 完全相同的 entitlement 门禁；**读优先**，写操作（发帖/回帖）二期再开或采用"只起草、人确认再发"，并复用发帖限流。MCP 绝不得成为绕过卡密的后门。

5. **对外部系统默认不开放入站公共 API**，只留窄而有意的"缝"：GitHub 以 webhook 入站（消费学员 PR 活动），通知类优先走出站 webhook。逐个、按明确教学/运营理由开 scoped 接口，不预留宽口。

## Consequences

- UI、MCP、潜在 REST 共用同一条鉴权路径，杜绝权限逻辑漂移。
- 接口形态（MCP / REST）的取舍被延后，且实现成本降为"服务层之上的薄适配器"。
- 既有 `course:full` 仍然保留“课程社区通行证”的产品语义，可解锁课程、论坛与 MCP 读取；新增 scope 允许后续单独发放论坛、MCP 或外部 API 权益。
- 外部 API 权益独立为 `api:read`，后续如需写入能力再新增更窄 scope，不把宽口默认挂在课程卡上。
- 软删除（`status = hidden | deleted`，不硬删）与发帖/回帖限流由服务层统一保证。
- 用户提交的 Markdown 渲染不得开启原始 HTML（不引入 `rehype-raw` 处理论坛正文），避免存储型 XSS；此约束在论坛 v1 规格中固化。
- 本 ADR 管辖"论坛访问模型 + entitlement 规则 + 数据库边界 + Agent/外部接口策略"；后续对这些的变更须更新本 ADR（见 `docs/agents/domain.md` 的 ADR 触发清单）。
- 详细落地见 `docs/草台编子识字班论坛v1实现规格.md`。
