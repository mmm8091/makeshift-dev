import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, redeemCodes } from "@/db/schema";
import { createAuth } from "@/lib/auth";
import { generateRedeemCode, hashRedeemCode } from "@/lib/redeem-codes";

type GenerateRedeemCodesBody = {
  count?: unknown;
  scope?: unknown;
  maxUses?: unknown;
  batchId?: unknown;
  expiresAt?: unknown;
};

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (!context) return Response.json({ error: "需要管理员权限" }, { status: 403 });

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
