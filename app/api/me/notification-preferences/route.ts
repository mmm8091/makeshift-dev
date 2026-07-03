import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";
import { createAuth } from "@/lib/auth";
import {
  getDailyDigestPreference,
  setDailyDigestPreference,
} from "@/lib/daily-digest";

type PreferencePatch = {
  dailyDigestEnabled?: unknown;
};

export async function GET(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return unauthorized();

  return Response.json(
    await getDailyDigestPreference({
      env: context.env,
      userId: context.session.user.id,
    }),
  );
}

export async function PATCH(request: Request) {
  const context = await getAuthedContext(request);
  if (!context) return unauthorized();

  const ipLimit = await requireRateLimit({
    env: context.env,
    namespace: "notification-preferences:update:ip",
    key: getClientIp(request),
    limit: 60,
    windowMs: 60 * 60_000,
  });
  if (ipLimit) return ipLimit;

  const body = (await request.json().catch(() => null)) as PreferencePatch | null;
  if (!body || typeof body.dailyDigestEnabled !== "boolean") {
    return Response.json({ error: "dailyDigestEnabled 必须是布尔值" }, { status: 400 });
  }

  await setDailyDigestPreference({
    env: context.env,
    userId: context.session.user.id,
    enabled: body.dailyDigestEnabled,
    unsubscribedAt: body.dailyDigestEnabled ? null : new Date(),
  });

  return Response.json({
    dailyDigestEnabled: body.dailyDigestEnabled,
  });
}

async function getAuthedContext(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: request.headers,
  });

  if (!session) return null;
  return { env, session };
}

function unauthorized() {
  return Response.json({ error: "请先登录" }, { status: 401 });
}
