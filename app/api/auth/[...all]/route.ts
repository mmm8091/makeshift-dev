import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

async function authHandler(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  return createAuth(env).handler(request);
}

export async function GET(request: Request) {
  return authHandler(request);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();
  const ip = getClientIp(request);

  const genericLimit = await requireRateLimit({
    env,
    namespace: "auth:post:ip",
    key: ip,
    limit: 120,
    windowMs: 60_000,
  });
  if (genericLimit) return genericLimit;

  const strict = authStrictLimit(path);
  if (strict) {
    const response = await requireRateLimit({
      env,
      namespace: strict.namespace,
      key: ip,
      limit: strict.limit,
      windowMs: strict.windowMs,
    });
    if (response) return response;
  }

  return authHandler(request);
}

function authStrictLimit(path: string) {
  if (path.includes("/sign-in/email")) {
    return { namespace: "auth:signin:ip", limit: 12, windowMs: 5 * 60_000 };
  }
  if (path.includes("/sign-up/email")) {
    return { namespace: "auth:signup:ip", limit: 6, windowMs: 60 * 60_000 };
  }
  if (path.includes("/email-otp/")) {
    return { namespace: "auth:email-otp:ip", limit: 10, windowMs: 10 * 60_000 };
  }
  if (path.includes("/reset-password") || path.includes("/forget-password")) {
    return { namespace: "auth:password-reset:ip", limit: 8, windowMs: 15 * 60_000 };
  }
  return null;
}
