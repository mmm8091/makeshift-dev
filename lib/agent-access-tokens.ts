import "server-only";

import { desc, eq, like } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import {
  agentAccessAuditLogs,
  agentAccessTokens,
  profiles,
  user,
} from "@/db/schema";
import {
  CAPABILITY_SCOPES,
  listActiveEntitlementScopes,
} from "@/lib/entitlements";

const TOKEN_PREFIX = "msd";
const TOKEN_RANDOM_LENGTH = 48;
const TOKEN_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const TOKEN_PREFIX_DISPLAY_LENGTH = 14;
const LAST_USED_UPDATE_WINDOW_MS = 5 * 60 * 1000;

export const AGENT_ACCESS_SCOPES = [
  "mcp:read",
  "mcp:write",
  "api:read",
  "api:write",
] as const;

export type AgentAccessScope = (typeof AGENT_ACCESS_SCOPES)[number];
export type AgentAccessSurface = "mcp" | "api";
export type AgentAccessOutcome = "ok" | "denied" | "error" | "rate_limited";

export type AgentAccessTokenView = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: AgentAccessScope[];
  expiresAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
};

export type AgentAccessContext = {
  tokenId: string;
  userId: string;
  displayName: string;
  tokenPrefix: string;
  scopes: AgentAccessScope[];
  grantedScopes: AgentAccessScope[];
  activeEntitlementScopes: string[];
  isAdmin: boolean;
};

export type AgentAccessAuthResult =
  | { ok: true; context: AgentAccessContext }
  | {
      ok: false;
      status: 401 | 403;
      reason: string;
      tokenId?: string;
      userId?: string;
      scope?: AgentAccessScope;
    };

export class AgentAccessTokenConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentAccessTokenConfigError";
  }
}

type TokenRow = typeof agentAccessTokens.$inferSelect;

const AGENT_ACCESS_SCOPE_SET = new Set<string>(AGENT_ACCESS_SCOPES);

function toMs(value: Date | number | null): number | null {
  if (value === null) return null;
  return value instanceof Date ? value.getTime() : value;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeScopes(scopes: readonly AgentAccessScope[]): AgentAccessScope[] {
  const seen = new Set<AgentAccessScope>();
  const normalized: AgentAccessScope[] = [];
  for (const scope of scopes) {
    if (!AGENT_ACCESS_SCOPE_SET.has(scope) || seen.has(scope)) continue;
    seen.add(scope);
    normalized.push(scope);
  }
  return normalized;
}

export function parseAgentAccessScopes(value: unknown): AgentAccessScope[] | null {
  if (!Array.isArray(value)) return null;
  const scopes: AgentAccessScope[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !AGENT_ACCESS_SCOPE_SET.has(item)) {
      return null;
    }
    scopes.push(item as AgentAccessScope);
  }
  return normalizeScopes(scopes);
}

function parseStoredScopes(value: string): AgentAccessScope[] {
  try {
    return parseAgentAccessScopes(JSON.parse(value)) ?? [];
  } catch {
    return [];
  }
}

function tokenView(row: TokenRow): AgentAccessTokenView {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: parseStoredScopes(row.scopes),
    expiresAt: toMs(row.expiresAt),
    revokedAt: toMs(row.revokedAt),
    lastUsedAt: toMs(row.lastUsedAt),
    createdAt: toMs(row.createdAt) ?? Date.now(),
  };
}

function randomToken(): string {
  const bytes = new Uint8Array(TOKEN_RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  const body = Array.from(
    bytes,
    (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length],
  ).join("");
  return `${TOKEN_PREFIX}_${body}`;
}

function tokenDisplayPrefix(token: string): string {
  return token.slice(0, TOKEN_PREFIX_DISPLAY_LENGTH);
}

function getPepper(env: CloudflareEnv): string {
  const pepper = env.AGENT_ACCESS_TOKEN_PEPPER;
  if (!pepper) {
    throw new AgentAccessTokenConfigError(
      "AGENT_ACCESS_TOKEN_PEPPER is not configured",
    );
  }
  return pepper;
}

async function hashWithAgentPepper(env: CloudflareEnv, value: string) {
  const data = new TextEncoder().encode(`${getPepper(env)}:${value}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashAgentAuditValue(
  env: CloudflareEnv,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  return hashWithAgentPepper(env, value);
}

export async function createAgentAccessToken({
  env,
  userId,
  name,
  scopes,
  expiresAt,
}: {
  env: CloudflareEnv;
  userId: string;
  name: string;
  scopes: readonly AgentAccessScope[];
  expiresAt?: Date | null;
}): Promise<{ plainToken: string; token: AgentAccessTokenView }> {
  const cleanName = normalizeName(name);
  if (!cleanName) throw new Error("Token name is required");

  const cleanScopes = normalizeScopes(scopes);
  if (cleanScopes.length === 0) throw new Error("At least one scope is required");

  const plainToken = randomToken();
  const row = {
    id: crypto.randomUUID(),
    userId,
    name: cleanName,
    tokenHash: await hashWithAgentPepper(env, plainToken),
    tokenPrefix: tokenDisplayPrefix(plainToken),
    scopes: JSON.stringify(cleanScopes),
    expiresAt: expiresAt ?? null,
  };

  await getDb(env).insert(agentAccessTokens).values(row);

  return {
    plainToken,
    token: {
      id: row.id,
      name: row.name,
      tokenPrefix: row.tokenPrefix,
      scopes: cleanScopes,
      expiresAt: toMs(row.expiresAt),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: Date.now(),
    },
  };
}

export async function listAgentAccessTokens(
  env: CloudflareEnv,
  userId: string,
): Promise<AgentAccessTokenView[]> {
  const rows = await getDb(env)
    .select()
    .from(agentAccessTokens)
    .where(eq(agentAccessTokens.userId, userId))
    .orderBy(desc(agentAccessTokens.createdAt));

  return rows.map(tokenView);
}

export async function revokeAgentAccessToken({
  env,
  userId,
  tokenId,
}: {
  env: CloudflareEnv;
  userId: string;
  tokenId: string;
}): Promise<boolean> {
  const result = await env.DB.prepare(
    [
      "UPDATE agent_access_tokens",
      "SET revoked_at = ?",
      "WHERE id = ?",
      "AND user_id = ?",
      "AND revoked_at IS NULL",
    ].join(" "),
  )
    .bind(Date.now(), tokenId, userId)
    .run();

  return Boolean(result.meta.changes);
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function capabilityScopesFor(scope: AgentAccessScope): readonly string[] {
  switch (scope) {
    case "mcp:read":
      return CAPABILITY_SCOPES.mcpRead;
    case "mcp:write":
      return CAPABILITY_SCOPES.mcpWrite;
    case "api:read":
      return CAPABILITY_SCOPES.apiRead;
    case "api:write":
      return CAPABILITY_SCOPES.apiWrite;
  }
}

function hasCapability(
  activeEntitlementScopes: readonly string[],
  scope: AgentAccessScope,
): boolean {
  const active = new Set(activeEntitlementScopes);
  return capabilityScopesFor(scope).some((candidate) => active.has(candidate));
}

async function loadTokenContext(
  db: Db,
  row: TokenRow & {
    accountName: string;
    displayName: string | null;
    role: string | null;
  },
): Promise<AgentAccessContext> {
  const scopes = parseStoredScopes(row.scopes);
  const activeEntitlementScopes = await listActiveEntitlementScopes(db, row.userId);
  const grantedScopes = scopes.filter((scope) =>
    hasCapability(activeEntitlementScopes, scope),
  );

  return {
    tokenId: row.id,
    userId: row.userId,
    displayName: row.displayName?.trim() || row.accountName || "佚名编子",
    tokenPrefix: row.tokenPrefix,
    scopes,
    grantedScopes,
    activeEntitlementScopes,
    isAdmin: row.role === "admin",
  };
}

export async function authenticateAgentAccess({
  env,
  authorization,
  requiredScope,
  ip,
  userAgent,
}: {
  env: CloudflareEnv;
  authorization: string | null;
  requiredScope?: AgentAccessScope;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<AgentAccessAuthResult> {
  const plainToken = parseBearerToken(authorization);
  if (!plainToken) {
    return { ok: false, status: 401, reason: "missing_bearer_token" };
  }

  const db = getDb(env);
  const tokenHash = await hashWithAgentPepper(env, plainToken);
  const [row] = await db
    .select({
      id: agentAccessTokens.id,
      userId: agentAccessTokens.userId,
      name: agentAccessTokens.name,
      tokenHash: agentAccessTokens.tokenHash,
      tokenPrefix: agentAccessTokens.tokenPrefix,
      scopes: agentAccessTokens.scopes,
      expiresAt: agentAccessTokens.expiresAt,
      revokedAt: agentAccessTokens.revokedAt,
      lastUsedAt: agentAccessTokens.lastUsedAt,
      lastUsedIpHash: agentAccessTokens.lastUsedIpHash,
      lastUsedUserAgentHash: agentAccessTokens.lastUsedUserAgentHash,
      createdAt: agentAccessTokens.createdAt,
      accountName: user.name,
      displayName: profiles.displayName,
      role: profiles.role,
    })
    .from(agentAccessTokens)
    .innerJoin(user, eq(agentAccessTokens.userId, user.id))
    .leftJoin(profiles, eq(agentAccessTokens.userId, profiles.userId))
    .where(eq(agentAccessTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    return { ok: false, status: 401, reason: "invalid_token" };
  }

  const now = Date.now();
  if (row.revokedAt) {
    return {
      ok: false,
      status: 401,
      reason: "token_revoked",
      tokenId: row.id,
      userId: row.userId,
      scope: requiredScope,
    };
  }
  if (row.expiresAt && row.expiresAt.getTime() <= now) {
    return {
      ok: false,
      status: 401,
      reason: "token_expired",
      tokenId: row.id,
      userId: row.userId,
      scope: requiredScope,
    };
  }

  const context = await loadTokenContext(db, row);
  if (requiredScope && !context.scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      reason: "scope_not_on_token",
      tokenId: context.tokenId,
      userId: context.userId,
      scope: requiredScope,
    };
  }
  if (requiredScope && !context.grantedScopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      reason: "scope_not_entitled",
      tokenId: context.tokenId,
      userId: context.userId,
      scope: requiredScope,
    };
  }

  await markAgentAccessTokenUsed({
    env,
    tokenId: context.tokenId,
    lastUsedAt: row.lastUsedAt,
    ip,
    userAgent,
  });

  return { ok: true, context };
}

async function markAgentAccessTokenUsed({
  env,
  tokenId,
  lastUsedAt,
  ip,
  userAgent,
}: {
  env: CloudflareEnv;
  tokenId: string;
  lastUsedAt: Date | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < LAST_USED_UPDATE_WINDOW_MS) {
    return;
  }

  await getDb(env)
    .update(agentAccessTokens)
    .set({
      lastUsedAt: new Date(),
      lastUsedIpHash: await hashAgentAuditValue(env, ip ?? null),
      lastUsedUserAgentHash: await hashAgentAuditValue(env, userAgent ?? null),
    })
    .where(eq(agentAccessTokens.id, tokenId));
}

export async function logAgentAccessAudit({
  env,
  tokenId,
  userId,
  surface,
  action,
  outcome,
  scope,
  ip,
  userAgent,
}: {
  env: CloudflareEnv;
  tokenId?: string | null;
  userId: string;
  surface: AgentAccessSurface;
  action: string;
  outcome: AgentAccessOutcome;
  scope?: AgentAccessScope | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await getDb(env).insert(agentAccessAuditLogs).values({
    id: crypto.randomUUID(),
    tokenId: tokenId ?? null,
    userId,
    surface,
    action: action.slice(0, 120),
    outcome,
    scope: scope ?? null,
    ipHash: await hashAgentAuditValue(env, ip ?? null),
    userAgentHash: await hashAgentAuditValue(env, userAgent ?? null),
  });
}

export async function listAgentAccessAuditTail({
  env,
  limit = 50,
}: {
  env: CloudflareEnv;
  limit?: number;
}) {
  const rows = await getDb(env)
    .select({
      id: agentAccessAuditLogs.id,
      tokenId: agentAccessAuditLogs.tokenId,
      tokenPrefix: agentAccessTokens.tokenPrefix,
      userId: agentAccessAuditLogs.userId,
      surface: agentAccessAuditLogs.surface,
      action: agentAccessAuditLogs.action,
      outcome: agentAccessAuditLogs.outcome,
      scope: agentAccessAuditLogs.scope,
      createdAt: agentAccessAuditLogs.createdAt,
    })
    .from(agentAccessAuditLogs)
    .leftJoin(
      agentAccessTokens,
      eq(agentAccessAuditLogs.tokenId, agentAccessTokens.id),
    )
    .orderBy(desc(agentAccessAuditLogs.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  return rows.map((row) => ({
    ...row,
    createdAt: toMs(row.createdAt),
  }));
}

export async function inspectAgentAccessToken({
  env,
  id,
  tokenPrefix,
}: {
  env: CloudflareEnv;
  id?: string;
  tokenPrefix?: string;
}) {
  const where = id
    ? eq(agentAccessTokens.id, id)
    : tokenPrefix
      ? like(agentAccessTokens.tokenPrefix, `${tokenPrefix}%`)
      : undefined;
  if (!where) return null;

  const [row] = await getDb(env)
    .select()
    .from(agentAccessTokens)
    .where(where)
    .limit(1);

  return row ? tokenView(row) : null;
}
