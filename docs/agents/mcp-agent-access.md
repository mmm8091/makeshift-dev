# Agent MCP 连接与测试

本文记录学员如何把自己的网站账号授权给自己的 Agent，并让 Agent 通过 MCP 访问课程和论坛。

适用范围：

- 学员自助连接 Codex 等支持 Streamable HTTP MCP 的客户端。
- Agent 代表学员读取课程章节表、读取单篇课程、读取论坛、发帖或回帖。
- 管理员排查 Agent token、审计元数据和用户 entitlement。

不适用：

- 不把网站账号密码交给 Agent。
- 不把 token 明文提交到仓库、截图、聊天记录或工单。
- 不批量导出全课程正文；课程正文只能按 slug 单篇读取。

## 学员连接流程

1. 登录网站。
2. 打开 `/me/agent-tokens`。
3. 创建一张 Agent access token。
4. 立即复制 token 明文；页面刷新后不会再显示。
5. 在 MCP 客户端里配置 Streamable HTTP：

```toml
[mcp_servers.makeshift_dev]
url = "https://makeshift-dev.digitalleft.org/api/mcp"

[mcp_servers.makeshift_dev.http_headers]
Authorization = "Bearer <token>"
```

Codex 设置界面可用等价配置：

- 类型：流式 HTTP
- URL：`https://makeshift-dev.digitalleft.org/api/mcp`
- 标头：
  - 键：`Authorization`
  - 值：`Bearer <token>`

二选一即可：

- 用静态标头时，只填 `Authorization: Bearer <token>`。
- 用环境变量时，只填 Bearer token 环境变量，例如 `MAKESHIFT_DEV_MCP_TOKEN`。

不要同时填静态 `Authorization` 标头和 Bearer token 环境变量；客户端可能优先读其中一个，导致排障困难。

## 安全约定

- token 明文只出现一次。丢失就撤销旧 token，重新生成。
- 如果 token 出现在聊天、截图或日志里，立即在 `/me/agent-tokens` 撤销。
- token scope 只是调用上限；实际能力仍实时取用户当前 entitlement。
- 当前 `course:full` 学员通行证覆盖课程、论坛、MCP 与外部 API 的学员能力。
- 审计日志只记录元数据，不记录课程正文、论坛正文、请求 / 响应 body、token 明文、原始 IP 或完整 UA。

## Agent 验收清单

连接成功后，让 Agent 按顺序测试：

1. 调用 `health_check`，确认服务在线和版本号。
2. 调用 `auth_whoami`，确认 token 属于当前学员。
3. 调用 `course_list_metadata`，确认能读取章节表且不返回正文。
4. 选择一个可读 slug，调用 `course_read_section`，确认能读取单篇文章。
5. 调用 `forum_list_posts`，确认能读取论坛列表。
6. 选择一个帖子 slug，调用 `forum_read_post`，确认能读取正文与评论。
7. 调用 `forum_dry_run_create_post`，确认要发的标题、正文、标签可通过校验。
8. 确认内容无误后再调用 `forum_create_post`。

写入类工具会真实落库，并复用论坛发帖 / 回帖限流。测试帖完成后由发帖人或管理员按论坛规则处理。

## 当前 MCP 工具名

对外主工具名使用下划线格式，便于 Codex 等客户端加载：

- `health_check`
- `auth_whoami`
- `entitlements_inspect_self`
- `rate_limit_inspect_self`
- `course_list_metadata`
- `course_read_section`
- `forum_list_posts`
- `forum_read_post`
- `forum_dry_run_create_post`
- `forum_create_post`
- `forum_create_comment`
- `admin_audit_tail`
- `admin_token_inspect`
- `admin_user_lookup`

旧点号工具名仍作为直接 HTTP 调用兼容别名保留，但新客户端配置和文档统一使用下划线工具名。

## 常见问题

### 客户端配置里显示 server enabled，但 Agent 看不到工具

先确认：

- 是否只保留一种认证方式。
- URL 是否是 `https://makeshift-dev.digitalleft.org/api/mcp`。
- `Authorization` 标头是否包含 `Bearer ` 前缀。
- 修改 MCP 配置后是否重启了 Codex / IDE / 当前 Agent 会话。

如果仍失败，用同一个 token 直接调用 `health_check` 排查服务端与 token，再看客户端加载日志。

### Agent 能读列表，不能读正文或发帖

通常是 entitlement 或 scope 不够：

- 读课程 / 论坛需要 token 有 `mcp:read`，且用户拥有 `course:full` 或对应能力。
- 发帖 / 回帖需要 token 有 `mcp:write`，且用户拥有 `course:full` 或对应能力。
- 用户撤销权益后，已有 token 会立即失去对应能力。

### 管理员工具能不能给普通学员用

不能。管理员工具同时要求 token scope 命中，且 token 所属用户的 `profiles.role = 'admin'`。
