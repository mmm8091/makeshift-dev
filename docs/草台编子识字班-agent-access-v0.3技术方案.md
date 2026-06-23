# 草台编子识字班 Agent Access v0.3 技术方案

配套决策：

- [docs/adr/2026-06-23-forum-and-agent-access-model.md](adr/2026-06-23-forum-and-agent-access-model.md)
- [docs/adr/2026-06-23-mcp-api-token-auth.md](adr/2026-06-23-mcp-api-token-auth.md)

## 目标

v0.3 把“学员可以授权自己的 Agent 访问课程和论坛”做成可用首版：

- 用户授权 Agent 访问令牌，MCP / 外部 API 不复用网页登录 cookie。
- Agent 可读取课程章节表，再按 slug 读取某一篇课程文章。
- Agent 可读取论坛列表和帖子详情。
- Agent 可发帖、回帖；真实写入必须复用 `lib/forum.ts`。
- 所有调用写审计元数据，不记录课程正文、论坛正文、请求 / 响应 body、token 明文、原始 IP 或完整 UA。

## 非目标

- 不做站点级全局 token。
- 不把付费课程正文打进仓库、前端 bundle、静态产物或日志。
- 不做“一次读取全课程正文”的工具。
- 不绕过 `lib/forum.ts` 直写论坛表。
- 不在本轮重做复杂管理后台。用户侧 token UI 可在后续前端轮接入同一服务层。

## 版本范围

### Token 服务层

新增 `lib/agent-access-tokens.ts`，作为 MCP / 外部 API 的唯一令牌服务层。

核心能力：

- 生成 token 明文，明文只在创建时返回一次。
- 使用独立 pepper 计算 token hash。
- 存储 token 安全前缀、名称、scope JSON、过期时间、撤销时间。
- 列表仅返回元数据，不返回明文或 hash。
- 撤销 token。
- 从 `Authorization: Bearer ...` 解析和校验 token。
- 校验时实时检查：hash 命中、未撤销、未过期、用户存在、token scope 命中、用户仍拥有对应 entitlement / capability。
- 更新 `last_used_at`、`last_used_ip_hash`、`last_used_user_agent_hash`，但做节流，避免 Agent 高频调用造成无意义写放大。
- 写入 `agent_access_audit_logs`。

建议类型契约：

```ts
export type AgentAccessScope =
  | "mcp:read"
  | "mcp:write"
  | "api:read"
  | "api:write";

export type AgentAccessSurface = "mcp" | "api";

export type AgentAccessOutcome = "ok" | "denied" | "error" | "rate_limited";

export type AgentAccessTokenView = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: AgentAccessScope[];
  expiresAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
};

export type AgentAccessContext = {
  tokenId: string;
  userId: string;
  tokenPrefix: string;
  scopes: AgentAccessScope[];
  grantedScopes: AgentAccessScope[];
  isAdmin: boolean;
};
```

### Scope 与 capability 规则

Token scope 是上限，用户实时 entitlement 是底线。

| 工具类型 | 需要 token scope | 用户 entitlement / capability |
| --- | --- | --- |
| MCP 读取 | `mcp:read` | `course:full` 或 `mcp:read` |
| MCP 写入 | `mcp:write` | `course:full` 或 `mcp:write` |
| 外部 API 读取 | `api:read` | `course:full` 或 `api:read` |
| 外部 API 写入 | `api:write` | `course:full` 或 `api:write` |

`course:full` 是学员通行证，不得因为新增细 scope 而失去 MCP / API 能力。

## MCP 工具

本版一次性做完整首版工具，不区分“只读先行”。

当前对外主工具名使用下划线格式，以便 Codex 等客户端稳定加载。旧点号工具名保留为直接 HTTP 调用兼容别名，不作为新文档和新客户端配置的推荐名称。

### 基础工具

- `health_check`
  - 不需要 token。
  - 返回服务状态、版本、时间。
- `auth_whoami`
  - 需要 `mcp:read`。
  - 返回当前 token 所属用户、token 前缀、granted scopes、是否管理员。
- `entitlements_inspect_self`
  - 需要 `mcp:read`。
  - 返回当前用户有效 entitlement scopes，不返回任何私密正文。
- `rate_limit_inspect_self`
  - 需要 `mcp:read`。
  - 返回当前 token / user 的 MCP 限流摘要。

### 课程工具

- `course_list_metadata`
  - 需要 `mcp:read`。
  - 一次返回全部已发布课程章节表。
  - 只返回 slug、标题、摘要、公开 / 锁定状态、顺序、父级 slug、所需 entitlement。
  - 不查询、不返回 `body_md`。

- `course_read_section`
  - 需要 `mcp:read`。
  - 输入：`slug`。
  - 输出：该章节元数据和正文 Markdown。
  - 公开章节可读；锁定章节必须通过 token scope 与用户 entitlement 双重校验。
  - 一次只读一篇文章，不提供全课程正文批量导出。

### 论坛工具

- `forum_list_posts`
  - 需要 `mcp:read`。
  - 输入：`tag?`、`cursor?`、`limit?`。
  - 输出分页帖子列表，与 UI 列表同样只给摘要，不泄漏完整正文。
  - 复用 `lib/forum.ts` 读取逻辑。

- `forum_read_post`
  - 需要 `mcp:read`。
  - 输入：`slug`。
  - 输出帖子正文、标签、评论、作者公开资料。
  - 复用 `lib/forum.ts`，尊重隐藏 / 删除 / 作者 / 管理员可见性。

- `forum_dry_run_create_post`
  - 需要 `mcp:write`。
  - 输入：标题、正文 Markdown、标签 slug。
  - 只做校验和权限检查，不落库。
  - 用于 Agent 在真实发帖前检查字段错误和权限。

- `forum_create_post`
  - 需要 `mcp:write`。
  - 输入：标题、正文 Markdown、标签 slug。
  - 真实写入必须调用 `lib/forum.ts` 的发帖服务，不另写 D1 直连。
  - 复用论坛发帖限流、标签校验、slug 生成和作者归属。

- `forum_create_comment`
  - 需要 `mcp:write`。
  - 输入：`postId` 或可解析的帖子标识、正文 Markdown。
  - 真实写入必须调用 `lib/forum.ts` 的回帖服务。
  - 复用论坛回帖限流。

### 管理员工具

管理员工具必须同时满足：

- token 有对应 scope。
- token 所属用户的 `profiles.role = "admin"`。

本版可做：

- `admin_audit_tail`
  - 需要 `mcp:read` + admin。
  - 返回最近审计日志元数据。
- `admin_token_inspect`
  - 需要 `mcp:read` + admin。
  - 按 token 前缀或 id 查看元数据，不返回明文或 hash。
- `admin_user_lookup`
  - 需要 `mcp:read` + admin。
  - 用于排障查询用户公开 / 管理元数据，不返回私密内容。

## REST / MCP 适配器

服务层优先，adapter 要薄。

建议先提供一个 MCP HTTP 入口，例如：

```txt
POST /api/mcp
Authorization: Bearer msd_...
```

处理流程：

1. 解析工具名和参数。
2. 对除 `health_check` 外的工具校验 Bearer token。
3. 根据工具声明检查 required scope。
4. 执行工具函数。
5. 记录审计元数据。
6. 返回 JSON。

后续如果要补窄 REST API，也复用同一个 token 服务层和工具函数，不重新实现鉴权。

## 性能与 Cloudflare 边界

本版主要消耗是 D1 查询次数和审计写入，不是 Worker CPU。

控制策略：

- `course_list_metadata` 一次返回全部课程章节表，但不碰正文。
- `course_read_section` 按 slug 单篇读取，不提供全课程正文批量读取。
- 所有列表工具必须分页。
- MCP 写工具接入现有论坛限流。
- Token 校验按 hash 查询；`token_hash` 已有唯一索引。
- `last_used_at` 更新做节流，例如同一 token 5 分钟内最多更新一次。
- 审计日志只写元数据。后续可按时间清理旧日志，避免表无限膨胀。
- 高频读压力上来后，再评估 D1 read replication；使用读副本时需接 D1 Sessions API。

建议限流：

| Namespace | 粒度 | 建议窗口 |
| --- | --- | --- |
| `mcp:token` | token id | 每分钟几十次 |
| `mcp:user` | user id | 每 10 分钟几百次 |
| `mcp:write:token` | token id | 写操作更低 |
| `mcp:write:user` | user id | 写操作更低 |

实际数值先保守，按 D1 analytics 和真实调用再调。

## 验收标准

- `pnpm typecheck` 通过。
- `pnpm build` 通过。
- 创建 token 后只显示一次明文；列表和审计不含明文。
- revoked / expired token 不能调用任何受保护工具。
- 用户失去 `course:full` 后，已有 token 立即失去对应 MCP 能力。
- `course_list_metadata` 不返回正文。
- `course_read_section` 无权限时不返回锁定课程正文。
- `forum_create_post` 和 `forum_create_comment` 经由 `lib/forum.ts`，并触发既有限流。
- 审计日志不包含课程正文、论坛正文、请求 / 响应 body、原始 IP、完整 UA。
- 管理员工具只允许 admin profile 使用。
