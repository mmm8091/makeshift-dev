import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, redeemCodes } from "@/db/schema";
import { createAuth } from "@/lib/auth";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-codes";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

type GenerateRedeemCodesBody = {
  count?: unknown;
  scope?: unknown;
  maxUses?: unknown;
  batchId?: unknown;
  expiresAt?: unknown;
};

type DisableRedeemBatchBody = {
  action?: unknown;
  batchId?: unknown;
  scope?: unknown;
};

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return Response.json({ error: "需要管理员权限" }, { status: 403 });

  const limit = await limitAdminRedeem(request, context.env, context.session.user.id);
  if (limit) return limit;

  const db = getDb(context.env);
  const batches = await db
    .select({
      batchId: redeemCodes.batchId,
      scope: redeemCodes.entitlementScope,
      codeCount: sql<number>`count(*)`,
      maxUses: sql<number>`sum(${redeemCodes.maxUses})`,
      usedCount: sql<number>`sum(${redeemCodes.usedCount})`,
      disabledCount: sql<number>`sum(case when ${redeemCodes.disabledAt} is not null then 1 else 0 end)`,
      expiresAt: sql<number | null>`min(${redeemCodes.expiresAt})`,
      createdAt: sql<number>`max(${redeemCodes.createdAt})`,
    })
    .from(redeemCodes)
    .groupBy(redeemCodes.batchId, redeemCodes.entitlementScope)
    .orderBy(sql`max(${redeemCodes.createdAt}) desc`)
    .limit(50);

  return Response.json({
    batches: batches.map((batch) => ({
      batchId: batch.batchId ?? "未分批",
      scope: batch.scope,
      codeCount: Number(batch.codeCount),
      maxUses: Number(batch.maxUses),
      usedCount: Number(batch.usedCount),
      disabledCount: Number(batch.disabledCount),
      expiresAt: batch.expiresAt ? new Date(Number(batch.expiresAt)).toISOString() : null,
      createdAt: new Date(Number(batch.createdAt)).toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return Response.json({ error: "需要管理员权限" }, { status: 403 });

  const limit = await limitAdminRedeem(request, context.env, context.session.user.id);
  if (limit) return limit;

  const body = (await request.json().catch(() => null)) as
    | GenerateRedeemCodesBody
    | null;
  const parsed = parseGenerateBody(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const db = getDb(context.env);
  const codes: string[] = [];
  const rows = [];

  for (let index = 0; index < parsed.count; index += 1) {
    const code = generateRedeemCode();
    codes.push(code);
    rows.push({
      id: crypto.randomUUID(),
      codeHash: await hashRedeemCode(context.env, code),
      batchId: parsed.batchId,
      entitlementScope: parsed.scope,
      maxUses: parsed.maxUses,
      expiresAt: parsed.expiresAt,
      createdBy: context.session.user.id,
    });
  }

  await db.insert(redeemCodes).values(rows);

  return Response.json({
    batchId: parsed.batchId,
    scope: parsed.scope,
    maxUses: parsed.maxUses,
    expiresAt: parsed.expiresAt?.toISOString() ?? null,
    codes,
  });
}

export async function PATCH(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return Response.json({ error: "需要管理员权限" }, { status: 403 });

  const limit = await limitAdminRedeem(request, context.env, context.session.user.id);
  if (limit) return limit;

  const body = (await request.json().catch(() => null)) as
    | DisableRedeemBatchBody
    | null;
  if (!body || body.action !== "disable") {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  const batchId =
    typeof body.batchId === "string" && body.batchId.trim()
      ? body.batchId.trim()
      : "";
  const scope =
    typeof body.scope === "string" && body.scope.trim() ? body.scope.trim() : "";
  if (!batchId || !scope) {
    return Response.json({ error: "缺少批次或 scope" }, { status: 400 });
  }

  const result = await context.env.DB.prepare(
    [
      "UPDATE redeem_codes",
      "SET disabled_at = ?",
      "WHERE batch_id = ?",
      "AND entitlement_scope = ?",
      "AND disabled_at IS NULL",
    ].join(" "),
  )
    .bind(Date.now(), batchId, scope)
    .run();

  return Response.json({ ok: true, disabledCount: result.meta.changes });
}

async function getAdminContext(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: request.headers,
  });
  if (!session) return null;

  const db = getDb(env);
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  if (profile?.role !== "admin") return null;
  return { env, session };
}

function parseGenerateBody(body: GenerateRedeemCodesBody | null) {
  if (!body) return { error: "请求内容不是有效 JSON" };

  const count = Number(body.count ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return { error: "一次生成数量需要在 1 到 200 之间" };
  }

  const scope =
    typeof body.scope === "string" && body.scope.trim()
      ? body.scope.trim()
      : "course:full";
  if (!/^[a-z0-9:_-]{3,80}$/i.test(scope)) {
    return { error: "权益 scope 格式不正确" };
  }

  const maxUses = Number(body.maxUses ?? 1);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000) {
    return { error: "单张卡可用次数需要在 1 到 1000 之间" };
  }

  const batchId =
    typeof body.batchId === "string" && body.batchId.trim()
      ? body.batchId.trim()
      : `batch-${new Date().toISOString().slice(0, 10)}`;
  if (batchId.length > 80) {
    return { error: "批次名最多 80 个字符" };
  }

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
    expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return { error: "过期时间格式不正确" };
    }
  }

  return { count, scope, maxUses, batchId, expiresAt };
}

async function limitAdminRedeem(
  request: Request,
  env: CloudflareEnv,
  userId: string,
) {
  const byIp = await requireRateLimit({
    env,
    namespace: "admin:redeem-codes:ip",
    key: getClientIp(request),
    limit: 80,
    windowMs: 60 * 60_000,
  });
  if (byIp) return byIp;

  return requireRateLimit({
    env,
    namespace: "admin:redeem-codes:user",
    key: userId,
    limit: 50,
    windowMs: 60 * 60_000,
  });
}
