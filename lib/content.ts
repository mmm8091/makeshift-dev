import prefaceMarkdown from "@/content/courses/preface.md";
import willMarkdown from "@/content/courses/01-will.md";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { courseSections } from "@/db/schema";
import { createAuth } from "@/lib/auth";
import {
  DEFAULT_COURSE_ENTITLEMENT,
  inferParentSlugFromTitle,
  type CourseEntry,
} from "@/lib/courses";
import {
  hasActiveEntitlement,
  listActiveEntitlementScopes,
} from "@/lib/entitlements";

/**
 * 公开课程正文的读取层（seam）。
 *
 * 现在：公开课程正文以 Markdown 存在仓库 `content/courses/{slug}.md`。
 * 这些公开文件在构建期作为字符串打进 Worker bundle，避免 Cloudflare
 * Workers 运行时读不到 Node 文件系统。
 *
 * 付费课程正文存 Cloudflare D1，由服务端校验 session + entitlement 后读取。
 * 未解锁时返回 null，由页面渲染解锁引导，不泄漏正文。
 */

const PUBLIC_COURSE_MARKDOWN: Record<string, string> = {
  preface: prefaceMarkdown,
  "01-will": willMarkdown,
};

/** 读取公开课程 Markdown 正文；不存在时返回 null。 */
export async function getPublicCourseMarkdown(
  slug: string,
): Promise<string | null> {
  // 防目录穿越：slug 只允许字母、数字、连字符
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  return PUBLIC_COURSE_MARKDOWN[slug] ?? null;
}

type CourseSectionRow = typeof courseSections.$inferSelect;

const publishedCourseColumns = {
  slug: courseSections.slug,
  title: courseSections.title,
  summary: courseSections.summary,
  visibility: courseSections.visibility,
  requiredEntitlement: courseSections.requiredEntitlement,
  orderIndex: courseSections.orderIndex,
};

function isSafeSlug(slug: string) {
  return /^[a-z0-9-]+$/i.test(slug);
}

function toCourseEntry(
  row: Pick<
    CourseSectionRow,
    "slug" | "title" | "summary" | "visibility" | "requiredEntitlement" | "orderIndex"
  >,
): CourseEntry {
  return {
    order: row.orderIndex,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    public: row.visibility === "public",
    available: true,
    source: "d1",
    requiredEntitlement:
      row.visibility === "locked"
        ? row.requiredEntitlement || DEFAULT_COURSE_ENTITLEMENT
        : row.requiredEntitlement,
    parentSlug: inferParentSlugFromTitle(row.title),
  };
}

/** 读取 D1 中已发布课程的公开元数据；不查询 body_md，避免目录层接触付费正文。 */
export async function getPublishedDbCourseEntries(
  env?: Pick<CloudflareEnv, "DB">,
): Promise<CourseEntry[]> {
  const rows = await getDb(env)
    .select(publishedCourseColumns)
    .from(courseSections)
    .where(eq(courseSections.status, "published"))
    .orderBy(asc(courseSections.orderIndex), asc(courseSections.slug));

  return rows.map(toCourseEntry);
}

/** 按 slug 读取 D1 课程元数据；不返回正文。 */
export async function getPublishedDbCourseEntry(
  slug: string,
  env?: Pick<CloudflareEnv, "DB">,
): Promise<CourseEntry | null> {
  if (!isSafeSlug(slug)) return null;

  const [row] = await getDb(env)
    .select(publishedCourseColumns)
    .from(courseSections)
    .where(and(eq(courseSections.slug, slug), eq(courseSections.status, "published")))
    .limit(1);

  return row ? toCourseEntry(row) : null;
}

/** 服务端读取 D1 正文：公开课直接返回，付费课必须有 session + 有效 entitlement。 */
export async function getDbCourseMarkdown({
  slug,
  env,
  requestHeaders,
}: {
  slug: string;
  env: CloudflareEnv;
  requestHeaders: Headers;
}): Promise<string | null> {
  if (!isSafeSlug(slug)) return null;

  const db = getDb(env);
  const [section] = await db
    .select({
      bodyMd: courseSections.bodyMd,
      visibility: courseSections.visibility,
      requiredEntitlement: courseSections.requiredEntitlement,
    })
    .from(courseSections)
    .where(and(eq(courseSections.slug, slug), eq(courseSections.status, "published")))
    .limit(1);

  if (!section?.bodyMd) return null;
  if (section.visibility === "public") return section.bodyMd;

  const session = await createAuth(env).api.getSession({
    headers: requestHeaders,
  });
  if (!session) return null;

  const scope = section.requiredEntitlement || DEFAULT_COURSE_ENTITLEMENT;
  const entitled = await hasActiveEntitlement(db, session.user.id, [scope]);
  return entitled ? section.bodyMd : null;
}

/** 服务端按已鉴权 userId 读取 D1 正文；供 MCP / API token adapter 复用。 */
export async function getDbCourseMarkdownForUser({
  slug,
  env,
  userId,
  additionalAllowedScopes = [],
}: {
  slug: string;
  env: CloudflareEnv;
  userId: string | null;
  additionalAllowedScopes?: readonly string[];
}): Promise<string | null> {
  if (!isSafeSlug(slug)) return null;

  const db = getDb(env);
  const [section] = await db
    .select({
      bodyMd: courseSections.bodyMd,
      visibility: courseSections.visibility,
      requiredEntitlement: courseSections.requiredEntitlement,
    })
    .from(courseSections)
    .where(and(eq(courseSections.slug, slug), eq(courseSections.status, "published")))
    .limit(1);

  if (!section?.bodyMd) return null;
  if (section.visibility === "public") return section.bodyMd;
  if (!userId) return null;

  const scope = section.requiredEntitlement || DEFAULT_COURSE_ENTITLEMENT;
  const entitled = await hasActiveEntitlement(db, userId, [
    scope,
    ...additionalAllowedScopes,
  ]);
  return entitled ? section.bodyMd : null;
}

/** 当前登录用户拥有的有效权益 scope；只返回 scope，不碰课程正文。 */
export async function getActiveEntitlementScopes({
  env,
  requestHeaders,
}: {
  env: CloudflareEnv;
  requestHeaders: Headers;
}): Promise<string[]> {
  const session = await createAuth(env).api.getSession({
    headers: requestHeaders,
  });
  if (!session) return [];

  return listActiveEntitlementScopes(getDb(env), session.user.id);
}
