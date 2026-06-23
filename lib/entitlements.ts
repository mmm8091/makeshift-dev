import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { entitlements } from "@/db/schema";
import { DEFAULT_COURSE_ENTITLEMENT } from "@/lib/courses";

export const ENTITLEMENT_SCOPES = {
  courseFull: DEFAULT_COURSE_ENTITLEMENT,
  forumAccess: "forum:access",
  mcpRead: "mcp:read",
  apiRead: "api:read",
} as const;

export const CAPABILITY_SCOPES = {
  course: [ENTITLEMENT_SCOPES.courseFull],
  forum: [ENTITLEMENT_SCOPES.forumAccess, ENTITLEMENT_SCOPES.courseFull],
  mcpRead: [ENTITLEMENT_SCOPES.mcpRead, ENTITLEMENT_SCOPES.courseFull],
  apiRead: [ENTITLEMENT_SCOPES.apiRead],
} as const;

export async function hasActiveEntitlement(
  db: Db,
  userId: string,
  scopes: readonly string[],
  now = new Date(),
): Promise<boolean> {
  if (scopes.length === 0) return false;

  const [row] = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        inArray(entitlements.scope, [...scopes]),
        lte(entitlements.startsAt, now),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
      ),
    )
    .limit(1);

  return Boolean(row);
}
