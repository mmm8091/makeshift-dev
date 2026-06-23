import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { entitlements, profiles, redeemCodeUses, redeemCodes } from "@/db/schema";
import { createAuth } from "@/lib/auth";
import {
  hashRedeemCode,
  hashWithRedeemPepper,
  normalizeRedeemCode,
} from "@/lib/redeem-codes";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

type RedeemBody = {
  code?: unknown;
};

export async function POST(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return Response.json({ error: "请先登录" }, { status: 401 });

  const ipLimit = await requireRateLimit({
    env: context.env,
    namespace: "redeem:ip",
    key: getClientIp(request),
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (ipLimit) return ipLimit;

  const userLimit = await requireRateLimit({
    env: context.env,
    namespace: "redeem:user",
    key: context.session.user.id,
    limit: 12,
    windowMs: 10 * 60_000,
  });
  if (userLimit) return userLimit;

  const body = (await request.json().catch(() => null)) as RedeemBody | null;
  if (!body || typeof body.code !== "string") {
    return Response.json({ error: "请输入卡密" }, { status: 400 });
  }

  const normalizedCode = normalizeRedeemCode(body.code);
  if (normalizedCode.length < 12 || normalizedCode.length > 80) {
    return Response.json({ error: "卡密格式不正确" }, { status: 400 });
  }

  const codeLimit = await requireRateLimit({
    env: context.env,
    namespace: "redeem:code",
    key: await hashWithRedeemPepper(context.env, normalizedCode),
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (codeLimit) return codeLimit;

  const db = getDb(context.env);
  const codeHash = await hashRedeemCode(context.env, normalizedCode);
  const [redeemCode] = await db
    .select()
    .from(redeemCodes)
    .where(eq(redeemCodes.codeHash, codeHash))
    .limit(1);

  if (!redeemCode) {
    return Response.json({ error: "卡密无效" }, { status: 400 });
  }

  const now = Date.now();
  if (
    redeemCode.disabledAt ||
    (redeemCode.expiresAt && redeemCode.expiresAt.getTime() < now)
  ) {
    return Response.json({ error: "卡密已失效" }, { status: 400 });
  }

  const [existingUse] = await db
    .select()
    .from(redeemCodeUses)
    .where(
      and(
        eq(redeemCodeUses.redeemCodeId, redeemCode.id),
        eq(redeemCodeUses.userId, context.session.user.id),
      ),
    )
    .limit(1);
  if (existingUse) {
    return Response.json({ error: "你已经兑换过这张卡" }, { status: 409 });
  }

  const updateResult = await context.env.DB.prepare(
    [
      "UPDATE redeem_codes",
      "SET used_count = used_count + 1",
      "WHERE id = ?",
      "AND disabled_at IS NULL",
      "AND (expires_at IS NULL OR expires_at > ?)",
      "AND used_count < max_uses",
      "AND NOT EXISTS (",
      "  SELECT 1 FROM redeem_code_uses",
      "  WHERE redeem_code_id = ? AND user_id = ?",
      ")",
    ].join(" "),
  )
    .bind(redeemCode.id, now, redeemCode.id, context.session.user.id)
    .run();

  if (!updateResult.meta.changes) {
    return Response.json({ error: "卡密已被用完或已经兑换过" }, { status: 409 });
  }

  try {
    await db.insert(redeemCodeUses).values({
      id: crypto.randomUUID(),
      redeemCodeId: redeemCode.id,
      userId: context.session.user.id,
      ipHash: await hashAuditValue(
        context.env,
        request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "",
      ),
      userAgentHash: await hashAuditValue(
        context.env,
        request.headers.get("user-agent") || "",
      ),
    });
  } catch (error) {
    await context.env.DB.prepare(
      "UPDATE redeem_codes SET used_count = used_count - 1 WHERE id = ? AND used_count > 0",
    )
      .bind(redeemCode.id)
      .run();

    return Response.json({ error: "你已经兑换过这张卡" }, { status: 409 });
  }

  await db
    .insert(entitlements)
    .values({
      id: crypto.randomUUID(),
      userId: context.session.user.id,
      scope: redeemCode.entitlementScope,
      source: "redeem_code",
      sourceId: redeemCode.id,
    })
    .onConflictDoNothing();

  return Response.json({
    ok: true,
    scope: redeemCode.entitlementScope,
  });
}

async function getAuthedContext(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: request.headers,
  });

  if (!session) return null;
  await getDb(env)
    .insert(profiles)
    .values({
      userId: session.user.id,
      displayName: session.user.name,
    })
    .onConflictDoNothing();
  return { env, session };
}

async function hashAuditValue(env: CloudflareEnv, value: string) {
  if (!value) return null;
  return hashWithRedeemPepper(env, value);
}
