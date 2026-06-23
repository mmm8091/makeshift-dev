# MCP / 外部 API 鉴权：用户授权令牌 + 实时 entitlement 门禁

- 日期：2026-06-23
- 状态：已采纳（Accepted）

## Context

论坛 v1 已经把课程、论坛与后续 Agent 接入统一到“服务层 + entitlement 门禁”模型：`course:full` 是当前学员通行证，解锁课程、论坛、MCP 与外部 API 的学员能力；同时预留 `forum:access`、`mcp:read` / `mcp:write`、`api:read` / `api:write` 等更细 scope。见 [2026-06-23-forum-and-agent-access-model](2026-06-23-forum-and-agent-access-model.md)。

下一阶段要做 MCP 与外部接口。它们和网页登录不同：调用方可能是桌面客户端、IDE、命令行、外部 Agent 或脚本，不适合复用浏览器 cookie；但它们读取的是付费课程正文和受限论坛内容，写入也可能进入论坛现场，不能成为绕过卡密和论坛限流的后门。

因此需要先决定鉴权边界与表设计，再实现具体 MCP handler / REST adapter。

## Decision

1. **MCP / 外部 API 使用用户授权的 Agent 访问令牌**。网页 UI 继续使用 Better Auth session；MCP、CLI、外部 Agent 与窄 REST API 使用 `Authorization: Bearer ...` 里的访问令牌。

2. **令牌只代表“这个客户端被这个用户授权调用”，不直接代表产品权益**。实际可用能力取交集：

   - 令牌声明的 scope：例如 `mcp:read`、`mcp:write`、`api:read`、`api:write`。
   - 用户当前仍有效的 entitlement / capability：例如 `course:full` 或未来的独立 `mcp:read`。

   这保证 `course:full` 学员仍能通过 MCP 读课程、读论坛、论坛发帖；也保证过期、撤销或被禁用的权益会立刻影响 token 调用。

3. **令牌明文只在创建时显示一次**。数据库只存 peppered hash、可展示的安全前缀、名称、scope JSON、过期时间、撤销时间与最近使用元数据；任何日志、文档和后台列表都不得写入令牌明文。

4. **D1 新增两张表**：

   - `agent_access_tokens`：存用户授权令牌的 hash、前缀、名称、scope、过期/撤销、最近使用元数据。
   - `agent_access_audit_logs`：记录 MCP / API 调用的元数据审计，包括 token、用户、入口面、动作、结果、scope、IP / UA hash 与时间。

5. **审计日志只记元数据，不记内容正文与秘密**。不得记录课程正文、论坛正文、请求/响应 body、卡密明文、token 明文、原始 IP 或完整 User-Agent。

6. **MCP / API 适配器必须调用既有服务层**。课程读取继续走课程内容服务；论坛读写继续走 `lib/forum.ts`。发帖、回帖、恢复、隐藏等写入不得在 MCP / API 中另写一套 D1 直连逻辑。

7. **撤销、过期、限流是一等路径**。后续实现 token helper 时，必须在每次请求校验 hash、撤销时间、过期时间、用户有效 entitlement、声明 scope，并接入现有限流与审计。

## Consequences

- MCP / API 不与浏览器 session 生命周期强绑定，适合桌面、CLI 与 Agent 场景。
- `course:full` 继续保持“学员通行证”语义，不会因为未来拆出 `mcp:*` / `api:*` 细 scope 导致既有学员失去 MCP / 论坛能力。
- Token 泄漏时的影响面被限制在该用户、该 token 的声明 scope 与仍有效 entitlement 内；管理员可通过撤销或禁用权益立刻阻断后续调用。
- 审计可回答“哪个用户 / token 在什么入口调用了什么动作，结果如何”，但不会复制受限内容或秘密。
- 后续仍需实现：令牌创建 / 列表 / 撤销 UI、Bearer token 校验 helper、MCP server adapter、窄 REST adapter、对 Agent 调用的更细限流策略。

## Alternatives Considered

- **复用 Better Auth cookie session**：放弃。MCP / CLI / 外部 Agent 不是浏览器场景，复用 cookie 会把 CSRF、浏览器会话生命周期和 Agent 调用绑在一起。
- **站点级全局 API token**：放弃。它会模糊真实用户身份，容易绕过 entitlement，也无法给论坛发帖等用户行为留下清晰归属。
- **把 entitlement 固化进 token 后长期信任**：放弃。权益会过期、撤销或被调整；token scope 只能作为上限，不能替代实时 entitlement 检查。
