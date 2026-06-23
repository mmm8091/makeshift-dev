import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq, like, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, user } from "@/db/schema";
import {
  authenticateAgentAccess,
  inspectAgentAccessToken,
  listAgentAccessAuditTail,
  logAgentAccessAudit,
  type AgentAccessContext,
  type AgentAccessOutcome,
  type AgentAccessScope,
} from "@/lib/agent-access-tokens";
import {
  getDbCourseMarkdownForUser,
  getPublishedDbCourseEntries,
  getPublishedDbCourseEntry,
  getPublicCourseMarkdown,
} from "@/lib/content";
import {
  getCourse,
  mergeArticlesWithDbCourses,
  type CourseEntry,
} from "@/lib/courses";
import { CAPABILITY_SCOPES, listActiveEntitlementScopes } from "@/lib/entitlements";
import {
  addComment,
  createPost,
  dryRunCreatePost,
  getThread,
  listPosts,
  type Viewer,
} from "@/lib/forum";
import { consumeRateLimit, getClientIp, requireRateLimit } from "@/lib/rate-limit";

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type ToolRequest = {
  tool?: unknown;
  name?: unknown;
  arguments?: unknown;
};

type ToolDefinition = {
  name: string;
  description: string;
  requiredScope?: AgentAccessScope;
  admin?: boolean;
  write?: boolean;
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: "health_check", description: "检查 MCP 入口健康状态" },
  {
    name: "auth_whoami",
    description: "查看当前 Agent 访问令牌对应的用户与授权 scope",
    requiredScope: "mcp:read",
  },
  {
    name: "entitlements_inspect_self",
    description: "查看当前用户有效 entitlement scopes",
    requiredScope: "mcp:read",
  },
  {
    name: "rate_limit_inspect_self",
    description: "查看 MCP 限流策略摘要",
    requiredScope: "mcp:read",
  },
  {
    name: "course_list_metadata",
    description: "一次返回全部已发布课程章节表，不返回正文",
    requiredScope: "mcp:read",
  },
  {
    name: "course_read_section",
    description: "按 slug 读取一篇课程文章 Markdown",
    requiredScope: "mcp:read",
  },
  {
    name: "forum_list_posts",
    description: "分页读取论坛帖子列表摘要",
    requiredScope: "mcp:read",
  },
  {
    name: "forum_read_post",
    description: "按 slug 读取论坛帖子详情和评论",
    requiredScope: "mcp:read",
  },
  {
    name: "forum_dry_run_create_post",
    description: "校验发帖参数和权限，不落库",
    requiredScope: "mcp:write",
    write: true,
  },
  {
    name: "forum_create_post",
    description: "创建论坛帖子，复用论坛服务层",
    requiredScope: "mcp:write",
    write: true,
  },
  {
    name: "forum_create_comment",
    description: "创建论坛回复，复用论坛服务层",
    requiredScope: "mcp:write",
    write: true,
  },
  {
    name: "admin_audit_tail",
    description: "管理员查看最近 Agent 访问审计元数据",
    requiredScope: "mcp:read",
    admin: true,
  },
  {
    name: "admin_token_inspect",
    description: "管理员查看 token 元数据，不返回明文或 hash",
    requiredScope: "mcp:read",
    admin: true,
  },
  {
    name: "admin_user_lookup",
    description: "管理员排障查询用户元数据和有效 entitlement",
    requiredScope: "mcp:read",
    admin: true,
  },
];

const TOOLS = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));
const LEGACY_TOOL_NAMES = new Map<string, string>([
  ["health.check", "health_check"],
  ["auth.whoami", "auth_whoami"],
  ["entitlements.inspect_self", "entitlements_inspect_self"],
  ["rate_limit.inspect_self", "rate_limit_inspect_self"],
  ["course.list_metadata", "course_list_metadata"],
  ["course.read_section", "course_read_section"],
  ["forum.list_posts", "forum_list_posts"],
  ["forum.read_post", "forum_read_post"],
  ["forum.dry_run_create_post", "forum_dry_run_create_post"],
  ["forum.create_post", "forum_create_post"],
  ["forum.create_comment", "forum_create_comment"],
  ["admin.audit.tail", "admin_audit_tail"],
  ["admin.token.inspect", "admin_token_inspect"],
  ["admin.user.lookup", "admin_user_lookup"],
]);

class ToolError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ToolError";
    this.status = status;
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    service: "makeshift-dev-agent-access",
    version: "0.3.0",
    tools: TOOL_DEFINITIONS.map(({ name, description }) => ({ name, description })),
  });
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }

  const rpc = body as JsonRpcRequest;
  if (rpc.method === "initialize") {
    return jsonRpcResult(rpc, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "makeshift-dev", version: "0.3.0" },
    });
  }
  if (rpc.method === "tools/list") {
    return jsonRpcResult(rpc, {
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { type: "object", additionalProperties: true },
      })),
    });
  }

  const parsed = parseToolRequest(body);
  if (!parsed) {
    return jsonOrDirectError(rpc, "未知 MCP 方法或工具调用格式", 400);
  }

  const toolName = LEGACY_TOOL_NAMES.get(parsed.name) ?? parsed.name;
  const tool = TOOLS.get(toolName);
  if (!tool) {
    return jsonOrDirectError(rpc, `未知工具：${parsed.name}`, 404);
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";

  if (tool.name === "health_check") {
    const result = await runTool({ env, tool, args: parsed.args, ip, userAgent });
    return jsonOrDirectResult(rpc, result);
  }

  const ipLimit = await requireRateLimit({
    env,
    namespace: "mcp:ip",
    key: ip,
    limit: 300,
    windowMs: 10 * 60_000,
  });
  if (ipLimit) return ipLimit;

  const auth = await authenticateAgentAccess({
    env,
    authorization: request.headers.get("authorization"),
    requiredScope: tool.requiredScope,
    ip,
    userAgent,
  });

  if (!auth.ok) {
    if (auth.userId) {
      await logAgentAccessAudit({
        env,
        tokenId: auth.tokenId,
        userId: auth.userId,
        surface: "mcp",
        action: tool.name,
        outcome: "denied",
        scope: auth.scope ?? tool.requiredScope ?? null,
        ip,
        userAgent,
      });
    }
    return jsonOrDirectError(rpc, auth.reason, auth.status);
  }

  if (tool.admin && !auth.context.isAdmin) {
    await audit(env, auth.context, tool, "denied", ip, userAgent);
    return jsonOrDirectError(rpc, "需要管理员权限", 403);
  }

  const rateLimited = await limitMcpCall(env, auth.context, tool.write === true);
  if (rateLimited) {
    await audit(env, auth.context, tool, "rate_limited", ip, userAgent);
    return jsonOrDirectError(rpc, "请求太频繁了，稍后再试", 429);
  }

  try {
    const result = await runTool({
      env,
      tool,
      args: parsed.args,
      context: auth.context,
      ip,
      userAgent,
    });
    await audit(env, auth.context, tool, outcomeFromResult(result), ip, userAgent);
    return jsonOrDirectResult(rpc, result);
  } catch (error) {
    await audit(env, auth.context, tool, "error", ip, userAgent);
    if (error instanceof ToolError) {
      return jsonOrDirectError(rpc, error.message, error.status);
    }
    return jsonOrDirectError(rpc, "工具执行失败", 500);
  }
}

function parseToolRequest(body: object): { name: string; args: Record<string, unknown> } | null {
  const direct = body as ToolRequest;
  if (typeof direct.tool === "string" || typeof direct.name === "string") {
    return {
      name: String(direct.tool ?? direct.name),
      args: toArgs(direct.arguments),
    };
  }

  const rpc = body as JsonRpcRequest;
  if (rpc.method === "tools/call" && rpc.params && typeof rpc.params === "object") {
    const params = rpc.params as { name?: unknown; arguments?: unknown };
    if (typeof params.name === "string") {
      return { name: params.name, args: toArgs(params.arguments) };
    }
  }

  return null;
}

function toArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function runTool({
  env,
  tool,
  args,
  context,
}: {
  env: CloudflareEnv;
  tool: ToolDefinition;
  args: Record<string, unknown>;
  context?: AgentAccessContext;
  ip: string;
  userAgent: string;
}) {
  switch (tool.name) {
    case "health_check":
      return {
        ok: true,
        service: "makeshift-dev-agent-access",
        version: "0.3.0",
        now: new Date().toISOString(),
      };
    case "auth_whoami":
      assertContext(context);
      return {
        userId: context.userId,
        displayName: context.displayName,
        tokenPrefix: context.tokenPrefix,
        scopes: context.scopes,
        grantedScopes: context.grantedScopes,
        isAdmin: context.isAdmin,
      };
    case "entitlements_inspect_self":
      assertContext(context);
      return { scopes: context.activeEntitlementScopes };
    case "rate_limit_inspect_self":
      assertContext(context);
      return {
        tokenPrefix: context.tokenPrefix,
        policies: [
          { namespace: "mcp:token", limit: 120, windowSeconds: 60 },
          { namespace: "mcp:user", limit: 600, windowSeconds: 600 },
          { namespace: "mcp:write:token", limit: 20, windowSeconds: 600 },
          { namespace: "mcp:write:user", limit: 40, windowSeconds: 600 },
        ],
      };
    case "course_list_metadata":
      return listCourseMetadata(env);
    case "course_read_section":
      assertContext(context);
      return readCourseSection(env, context.userId, getString(args, "slug"));
    case "forum_list_posts":
      assertContext(context);
      return listPosts({
        env,
        viewer: forumViewer(context),
        tag: getOptionalString(args, "tag") ?? undefined,
        cursor: getOptionalString(args, "cursor") ?? undefined,
        limit: getOptionalNumber(args, "limit") ?? undefined,
      });
    case "forum_read_post":
      assertContext(context);
      return readForumPost(env, context, getString(args, "slug"));
    case "forum_dry_run_create_post":
      assertContext(context);
      return dryRunCreatePost({
        env,
        viewer: forumViewer(context),
        input: getPostInput(args),
      });
    case "forum_create_post":
      assertContext(context);
      return createPost({
        env,
        viewer: forumViewer(context),
        input: getPostInput(args),
      });
    case "forum_create_comment":
      assertContext(context);
      return createForumComment(env, context, args);
    case "admin_audit_tail":
      return listAgentAccessAuditTail({
        env,
        limit: getOptionalNumber(args, "limit") ?? 50,
      });
    case "admin_token_inspect":
      return inspectAgentAccessToken({
        env,
        id: getOptionalString(args, "id") ?? undefined,
        tokenPrefix: getOptionalString(args, "tokenPrefix") ?? undefined,
      });
    case "admin_user_lookup":
      return lookupUser(env, getString(args, "query"));
    default:
      throw new ToolError(`未知工具：${tool.name}`, 404);
  }
}

async function listCourseMetadata(env: CloudflareEnv) {
  const entries = mergeArticlesWithDbCourses(await getPublishedDbCourseEntries(env));
  return {
    courses: entries
      .filter((entry) => entry.available && entry.slug)
      .map(courseMetadata),
  };
}

function courseMetadata(entry: CourseEntry) {
  return {
    order: entry.order,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    public: entry.public,
    available: entry.available,
    source: entry.source,
    requiredEntitlement: entry.requiredEntitlement ?? null,
    parentSlug: entry.parentSlug ?? null,
  };
}

async function readCourseSection(
  env: CloudflareEnv,
  userId: string,
  slug: string,
) {
  const staticEntry = getCourse(slug);
  const staticMarkdown = await getPublicCourseMarkdown(slug);
  if (staticEntry?.available && staticMarkdown) {
    return { course: courseMetadata(staticEntry), bodyMd: staticMarkdown };
  }

  const entry = await getPublishedDbCourseEntry(slug, env);
  if (!entry) throw new ToolError("课程不存在", 404);

  const bodyMd = await getDbCourseMarkdownForUser({
    env,
    slug,
    userId,
    additionalAllowedScopes: CAPABILITY_SCOPES.mcpRead,
  });
  if (!bodyMd) throw new ToolError("无权读取该课程或正文尚未发布", 403);

  return { course: courseMetadata(entry), bodyMd };
}

async function readForumPost(
  env: CloudflareEnv,
  context: AgentAccessContext,
  slug: string,
) {
  const thread = await getThread({ env, viewer: forumViewer(context), slug });
  if (!thread) throw new ToolError("帖子不存在或无权读取", 404);
  return thread;
}

async function createForumComment(
  env: CloudflareEnv,
  context: AgentAccessContext,
  args: Record<string, unknown>,
) {
  let postId = getOptionalString(args, "postId");
  const slug = getOptionalString(args, "slug");
  if (!postId && slug) {
    const thread = await getThread({ env, viewer: forumViewer(context), slug });
    postId = thread?.post.id ?? null;
  }
  if (!postId) throw new ToolError("缺少 postId 或有效 slug");

  return addComment({
    env,
    viewer: forumViewer(context),
    postId,
    bodyMd: getString(args, "bodyMd"),
  });
}

async function lookupUser(env: CloudflareEnv, query: string) {
  const q = query.trim();
  if (!q) throw new ToolError("缺少 query");

  const rows = await getDb(env)
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      displayName: profiles.displayName,
      role: profiles.role,
      qqNumber: profiles.qqNumber,
    })
    .from(user)
    .leftJoin(profiles, eq(user.id, profiles.userId))
    .where(
      or(
        eq(user.id, q),
        eq(user.email, q),
        like(user.email, `%${q}%`),
        like(user.name, `%${q}%`),
        like(profiles.displayName, `%${q}%`),
      ),
    )
    .orderBy(desc(user.createdAt))
    .limit(20);

  const byId = new Map<string, {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    displayName: string | null;
    role: string | null;
    qqNumber: string | null;
  }>();

  for (const row of rows) {
    const existing =
      byId.get(row.id) ??
      {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        createdAt: row.createdAt.getTime(),
        displayName: row.displayName,
        role: row.role,
        qqNumber: row.qqNumber,
      };
    byId.set(row.id, existing);
  }

  const users = [];
  for (const item of byId.values()) {
    users.push({
      ...item,
      activeEntitlementScopes: await listActiveEntitlementScopes(getDb(env), item.id),
    });
  }
  return { users };
}

function forumViewer(context: AgentAccessContext): Viewer {
  return {
    userId: context.userId,
    displayName: context.displayName,
    role: context.isAdmin ? "admin" : "student",
    hasForumAccess:
      context.grantedScopes.includes("mcp:read") ||
      context.grantedScopes.includes("mcp:write"),
  };
}

function assertContext(
  context: AgentAccessContext | undefined,
): asserts context is AgentAccessContext {
  if (!context) throw new ToolError("需要 Agent 访问令牌", 401);
}

function getString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ToolError(`缺少参数：${key}`);
  }
  return value.trim();
}

function getOptionalString(
  args: Record<string, unknown>,
  key: string,
): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalNumber(
  args: Record<string, unknown>,
  key: string,
): number | null {
  const value = args[key];
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ToolError(`参数不是有效数字：${key}`);
  return n;
}

function getPostInput(args: Record<string, unknown>) {
  const tags = args.tagSlugs ?? args.tags ?? [];
  return {
    title: getString(args, "title"),
    bodyMd: getString(args, "bodyMd"),
    tagSlugs: Array.isArray(tags) ? tags.map(String) : [],
  };
}

async function limitMcpCall(
  env: CloudflareEnv,
  context: AgentAccessContext,
  write: boolean,
): Promise<boolean> {
  const tokenLimit = await consumeRateLimit({
    env,
    namespace: write ? "mcp:write:token" : "mcp:token",
    key: context.tokenId,
    limit: write ? 20 : 120,
    windowMs: write ? 10 * 60_000 : 60_000,
  });
  if (!tokenLimit.ok) return true;

  const userLimit = await consumeRateLimit({
    env,
    namespace: write ? "mcp:write:user" : "mcp:user",
    key: context.userId,
    limit: write ? 40 : 600,
    windowMs: 10 * 60_000,
  });
  return !userLimit.ok;
}

function outcomeFromResult(result: unknown): AgentAccessOutcome {
  if (!result || typeof result !== "object" || !("ok" in result)) return "ok";
  const maybe = result as { ok?: unknown; reason?: unknown };
  if (maybe.ok !== false) return "ok";
  if (maybe.reason === "rate_limited") return "rate_limited";
  if (maybe.reason === "forbidden") return "denied";
  return "error";
}

async function audit(
  env: CloudflareEnv,
  context: AgentAccessContext,
  tool: ToolDefinition,
  outcome: AgentAccessOutcome,
  ip: string,
  userAgent: string,
) {
  await logAgentAccessAudit({
    env,
    tokenId: context.tokenId,
    userId: context.userId,
    surface: "mcp",
    action: tool.name,
    outcome,
    scope: tool.requiredScope ?? null,
    ip,
    userAgent,
  });
}

function jsonOrDirectResult(rpc: JsonRpcRequest, result: unknown) {
  if (rpc.method) {
    return jsonRpcResult(rpc, {
      content: [{ type: "text", text: JSON.stringify(result) }],
    });
  }
  return Response.json({ ok: true, result });
}

function jsonOrDirectError(rpc: JsonRpcRequest, message: string, status: number) {
  if (rpc.method) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        error: { code: status, message },
      },
      { status },
    );
  }
  return Response.json({ ok: false, error: message }, { status });
}

function jsonRpcResult(rpc: JsonRpcRequest, result: unknown) {
  return Response.json({
    jsonrpc: "2.0",
    id: rpc.id ?? null,
    result,
  });
}
