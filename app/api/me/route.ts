import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, user } from "@/db/schema";
import { createAuth } from "@/lib/auth";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

type ProfilePatch = {
  displayName?: unknown;
  qqNumber?: unknown;
  bio?: unknown;
};

export async function GET(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return unauthorized();

  const profile = await ensureProfile(
    context.env,
    context.session.user.id,
    context.session.user.name,
  );

  return Response.json({
    user: {
      id: context.session.user.id,
      email: context.session.user.email,
      emailVerified: context.session.user.emailVerified,
      name: context.session.user.name,
      image: context.session.user.image,
    },
    profile,
  });
}

export async function PATCH(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return unauthorized();

  const ipLimit = await requireRateLimit({
    env: context.env,
    namespace: "profile:update:ip",
    key: getClientIp(request),
    limit: 60,
    windowMs: 60 * 60_000,
  });
  if (ipLimit) return ipLimit;

  const userLimit = await requireRateLimit({
    env: context.env,
    namespace: "profile:update:user",
    key: context.session.user.id,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (userLimit) return userLimit;

  const body = (await request.json().catch(() => null)) as ProfilePatch | null;
  if (!body) {
    return Response.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }

  const parsed = parseProfilePatch(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const db = getDb(context.env);
  const existingProfile = await ensureProfile(
    context.env,
    context.session.user.id,
    context.session.user.name,
  );
  const nextDisplayName =
    parsed.displayName ?? existingProfile.displayName ?? context.session.user.name;
  const now = new Date();

  if (parsed.displayName) {
    await db
      .update(user)
      .set({
        name: parsed.displayName,
        updatedAt: now,
      })
      .where(eq(user.id, context.session.user.id));
  }

  await db
    .update(profiles)
    .set({
      displayName: nextDisplayName,
      qqNumber:
        parsed.qqNumber === undefined ? existingProfile.qqNumber : parsed.qqNumber,
      bio: parsed.bio === undefined ? existingProfile.bio : parsed.bio,
      updatedAt: now,
    })
    .where(eq(profiles.userId, context.session.user.id));

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, context.session.user.id))
    .limit(1);

  return Response.json({ profile });
}

async function getAuthedContext(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: request.headers,
  });

  if (!session) return null;
  return { env, session };
}

async function ensureProfile(
  env: CloudflareEnv,
  userId: string,
  displayName: string,
) {
  const db = getDb(env);
  await db
    .insert(profiles)
    .values({
      userId,
      displayName,
    })
    .onConflictDoNothing();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile;
}

function parseProfilePatch(body: ProfilePatch) {
  const patch: {
    displayName?: string;
    qqNumber?: string | null;
    bio?: string | null;
  } = {};

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string") {
      return { error: "昵称格式不正确" };
    }
    const displayName = body.displayName.trim();
    if (displayName.length < 1 || displayName.length > 40) {
      return { error: "昵称长度需要在 1 到 40 个字之间" };
    }
    patch.displayName = displayName;
  }

  if (body.qqNumber !== undefined) {
    if (body.qqNumber === null || body.qqNumber === "") {
      patch.qqNumber = null;
    } else if (
      typeof body.qqNumber === "string" &&
      /^\d{5,12}$/.test(body.qqNumber.trim())
    ) {
      patch.qqNumber = body.qqNumber.trim();
    } else {
      return { error: "QQ 号需要是 5 到 12 位数字" };
    }
  }

  if (body.bio !== undefined) {
    if (body.bio === null || body.bio === "") {
      patch.bio = null;
    } else if (typeof body.bio === "string" && body.bio.trim().length <= 160) {
      patch.bio = body.bio.trim();
    } else {
      return { error: "简介最多 160 个字" };
    }
  }

  return patch;
}

function unauthorized() {
  return Response.json({ error: "请先登录" }, { status: 401 });
}
