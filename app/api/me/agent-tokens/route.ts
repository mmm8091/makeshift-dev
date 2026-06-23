import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import {
  createAgentAccessToken,
  listAgentAccessTokens,
  parseAgentAccessScopes,
  revokeAgentAccessToken,
} from "@/lib/agent-access-tokens";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

type CreateBody = {
  name?: unknown;
  scopes?: unknown;
  expiresAt?: unknown;
};

type PatchBody = {
  action?: unknown;
  tokenId?: unknown;
};

export async function GET(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return Response.json({ error: "请先登录" }, { status: 401 });

  const limit = await limitTokenAdmin(request, context.env, context.userId);
  if (limit) return limit;

  return Response.json({
    tokens: await listAgentAccessTokens(context.env, context.userId),
  });
}

export async function POST(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return Response.json({ error: "请先登录" }, { status: 401 });

  const limit = await limitTokenAdmin(request, context.env, context.userId);
  if (limit) return limit;

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  const parsed = parseCreateBody(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await createAgentAccessToken({
      env: context.env,
      userId: context.userId,
      name: parsed.name,
      scopes: parsed.scopes,
      expiresAt: parsed.expiresAt,
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "无法创建 Agent 访问令牌";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return Response.json({ error: "请先登录" }, { status: 401 });

  const limit = await limitTokenAdmin(request, context.env, context.userId);
  if (limit) return limit;

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || body.action !== "revoke" || typeof body.tokenId !== "string") {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }

  const ok = await revokeAgentAccessToken({
    env: context.env,
    userId: context.userId,
    tokenId: body.tokenId,
  });

  return Response.json({ ok });
}

async function getAuthedContext(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: request.headers,
  });
  if (!session) return null;
  return { env, userId: session.user.id };
}

function parseCreateBody(body: CreateBody | null) {
  if (!body) return { error: "请求内容不是有效 JSON" };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "请填写令牌名称" };
  if (name.length > 80) return { error: "令牌名称最多 80 个字符" };

  const scopes = parseAgentAccessScopes(body.scopes);
  if (!scopes || scopes.length === 0) {
    return { error: "请选择至少一个有效 scope" };
  }

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
    expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return { error: "过期时间格式不正确" };
    }
    if (expiresAt.getTime() <= Date.now()) {
      return { error: "过期时间必须晚于当前时间" };
    }
  }

  return { name, scopes, expiresAt };
}

async function limitTokenAdmin(
  request: Request,
  env: CloudflareEnv,
  userId: string,
) {
  const byIp = await requireRateLimit({
    env,
    namespace: "agent-tokens:ip",
    key: getClientIp(request),
    limit: 80,
    windowMs: 60 * 60_000,
  });
  if (byIp) return byIp;

  return requireRateLimit({
    env,
    namespace: "agent-tokens:user",
    key: userId,
    limit: 50,
    windowMs: 60 * 60_000,
  });
}
