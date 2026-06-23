type RateLimitOptions = {
  env: CloudflareEnv;
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export async function consumeRateLimit({
  env,
  namespace,
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const keyHash = await hashRateLimitKey(env, `${namespace}:${key}`);
  const id = `${namespace}:${keyHash}`;

  const row = await env.DB.prepare(
    [
      "INSERT INTO rate_limits",
      "(id, namespace, key_hash, window_started_at, count, updated_at)",
      "VALUES (?, ?, ?, ?, 1, ?)",
      "ON CONFLICT(id) DO UPDATE SET",
      "window_started_at = CASE",
      "  WHEN rate_limits.window_started_at <= ? THEN excluded.window_started_at",
      "  ELSE rate_limits.window_started_at",
      "END,",
      "count = CASE",
      "  WHEN rate_limits.window_started_at <= ? THEN 1",
      "  ELSE rate_limits.count + 1",
      "END,",
      "updated_at = excluded.updated_at",
      "RETURNING count, window_started_at",
    ].join(" "),
  )
    .bind(id, namespace, keyHash, now, now, windowStart, windowStart)
    .first<{ count: number; window_started_at: number }>();

  void cleanupOldRateLimits(env, now);

  const count = Number(row?.count ?? 1);
  const startedAt = Number(row?.window_started_at ?? now);
  const retryAfterSeconds =
    count > limit ? Math.max(1, Math.ceil((startedAt + windowMs - now) / 1000)) : 0;

  return {
    ok: count <= limit,
    retryAfterSeconds,
    remaining: Math.max(0, limit - count),
  };
}

export async function requireRateLimit(options: RateLimitOptions) {
  const result = await consumeRateLimit(options);
  if (result.ok) return null;

  return Response.json(
    { error: "请求太频繁了，稍后再试" },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
      },
    },
  );
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function hashRateLimitKey(env: CloudflareEnv, value: string) {
  const secret = env.BETTER_AUTH_SECRET || env.REDEEM_CODE_PEPPER || "dev";
  const data = new TextEncoder().encode(`${secret}:${value}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function cleanupOldRateLimits(env: CloudflareEnv, now: number) {
  const sample = new Uint8Array(1);
  crypto.getRandomValues(sample);
  if (sample[0] > 6) return;

  const cutoff = now - 48 * 60 * 60 * 1000;
  try {
    await env.DB.prepare("DELETE FROM rate_limits WHERE updated_at < ?")
      .bind(cutoff)
      .run();
  } catch {
    // Cleanup is opportunistic; the foreground request should not fail because of it.
  }
}
