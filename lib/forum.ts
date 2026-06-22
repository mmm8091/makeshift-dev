/**
 * 论坛服务层（`lib/forum.ts`）—— 论坛 v1 的后端实现。
 *
 * 设计见 docs/adr/2026-06-23-forum-and-agent-access-model.md，
 * 落地规格见 docs/草台编子识字班论坛v1实现规格.md §4。
 *
 * 所有读写都经此层：session、entitlement、作者/管理员授权、限流、软删除只在这里。
 * UI 现在调它；未来 MCP / REST 调同一批函数。
 */

import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import {
  entitlements,
  forumComments,
  forumPosts,
  forumPostTags,
  forumTags,
  profiles,
} from "@/db/schema";
import { createAuth } from "@/lib/auth";
import { DEFAULT_COURSE_ENTITLEMENT } from "@/lib/courses";
import {
  TITLE_MAX,
  BODY_MAX,
  MAX_TAGS,
  type Author,
  type Comment,
  type ContentStatus,
  type ForumRole,
  type ModerationAction,
  type PostListPage,
  type PostPatch,
  type PostSummary,
  type Tag,
  type ThreadView,
  type Viewer,
  type WriteResult,
} from "@/lib/forum-types";

// 为 server 端调用方转出契约（客户端组件请直接从 @/lib/forum-types 引）。
export * from "@/lib/forum-types";

type ServiceArgs = {
  env: CloudflareEnv;
  requestHeaders: Headers;
};

type ForumPostRow = typeof forumPosts.$inferSelect;
type ForumCommentRow = typeof forumComments.$inferSelect;

const SAFE_SLUG_RE = /^[a-z0-9-]+$/;
const SAFE_CURSOR_RE = /^[a-zA-Z0-9-]+$/;

const POST_RATE_MS = 5_000;
const COMMENT_RATE_MS = 3_000;

const DEFAULT_TAGS: Tag[] = [
  { slug: "homework", name: "作业分享" },
  { slug: "ask", name: "提问求助" },
  { slug: "share", name: "项目分享" },
  { slug: "pitfall", name: "避坑记录" },
];
const DEFAULT_TAG_ORDER = new Map(DEFAULT_TAGS.map((tag, index) => [tag.slug, index]));

function isSafeSlug(slug: string): boolean {
  return SAFE_SLUG_RE.test(slug);
}

function isSafeCursor(cursor: string): boolean {
  return SAFE_CURSOR_RE.test(cursor);
}

function toMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

function toForumRole(role: string | null | undefined): ForumRole {
  return role === "admin" ? "admin" : "student";
}

function authorOf(row: {
  userId: string;
  displayName: string | null;
  qqNumber: string | null;
}): Author {
  return {
    userId: row.userId,
    displayName: row.displayName?.trim() || "佚名编子",
    qq: row.qqNumber ?? null,
  };
}

function canSeeStatus(
  viewer: Viewer,
  status: ContentStatus,
  authorId: string,
): boolean {
  if (status === "published") return true;
  return viewer.role === "admin" || viewer.userId === authorId;
}

function canEdit(viewer: Viewer, authorId: string): boolean {
  return viewer.role === "admin" || viewer.userId === authorId;
}

function removedExcerpt(status: ContentStatus): string {
  return status === "hidden" ? "这个内容已被隐藏" : "这个内容已被删除";
}

function sortTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    const ai = DEFAULT_TAG_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bi = DEFAULT_TAG_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.slug.localeCompare(b.slug);
  });
}

/** Markdown -> 纯文本预览：去掉常见控制符，列表页不暴露正文 Markdown。 */
function excerptOf(bodyMd: string, max = 80): string {
  const text = bodyMd
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function ensureDefaultTags(db: Db): Promise<void> {
  await db
    .insert(forumTags)
    .values(DEFAULT_TAGS.map((tag) => ({ id: `tag-${tag.slug}`, ...tag })))
    .onConflictDoNothing();
}

async function loadTagsForPosts(
  db: Db,
  postIds: string[],
): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  for (const id of postIds) map.set(id, []);
  if (postIds.length === 0) return map;

  const rows = await db
    .select({
      postId: forumPostTags.postId,
      slug: forumTags.slug,
      name: forumTags.name,
    })
    .from(forumPostTags)
    .innerJoin(forumTags, eq(forumPostTags.tagId, forumTags.id))
    .where(inArray(forumPostTags.postId, postIds))
    .orderBy(asc(forumTags.slug));

  for (const row of rows) {
    map.get(row.postId)?.push({ slug: row.slug, name: row.name });
  }
  for (const [postId, tags] of map) {
    map.set(postId, sortTags(tags));
  }
  return map;
}

async function loadPublishedCommentCounts(
  db: Db,
  postIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (postIds.length === 0) return map;

  const rows = await db
    .select({
      postId: forumComments.postId,
      count: sql<number>`count(*)`,
    })
    .from(forumComments)
    .where(
      and(
        inArray(forumComments.postId, postIds),
        eq(forumComments.status, "published"),
      ),
    )
    .groupBy(forumComments.postId);

  for (const row of rows) map.set(row.postId, Number(row.count));
  return map;
}

function normalizeTagSlugs(tagSlugs: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of tagSlugs) {
    const slug = raw.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    normalized.push(slug);
  }
  return normalized;
}

async function validateTagSlugs(
  db: Db,
  tagSlugs: string[],
): Promise<{ tagIds: string[]; error: string | null }> {
  const normalized = normalizeTagSlugs(tagSlugs);
  if (normalized.length > MAX_TAGS) {
    return { tagIds: [], error: `最多 ${MAX_TAGS} 个标签` };
  }
  if (normalized.some((slug) => !isSafeSlug(slug))) {
    return { tagIds: [], error: "含未知标签" };
  }
  if (normalized.length === 0) return { tagIds: [], error: null };

  await ensureDefaultTags(db);
  const rows = await db
    .select({ id: forumTags.id, slug: forumTags.slug })
    .from(forumTags)
    .where(inArray(forumTags.slug, normalized));

  if (rows.length !== normalized.length) {
    return { tagIds: [], error: "含未知标签" };
  }

  const idsBySlug = new Map(rows.map((row) => [row.slug, row.id]));
  return {
    tagIds: normalized.map((slug) => idsBySlug.get(slug)!),
    error: null,
  };
}

function validateTitle(title: string): string | null {
  const t = title.trim();
  if (t.length === 0) return "标题不能为空";
  if (t.length > TITLE_MAX) return `标题不超过 ${TITLE_MAX} 字`;
  return null;
}

function validateBody(bodyMd: string): string | null {
  const b = bodyMd.trim();
  if (b.length === 0) return "正文不能为空";
  if (b.length > BODY_MAX) return `正文不超过 ${BODY_MAX} 字`;
  return null;
}

async function recentlyWrote(
  db: Db,
  table: typeof forumPosts | typeof forumComments,
  authorId: string,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(and(eq(table.authorId, authorId), gt(table.createdAt, since)))
    .limit(1);
  return Number(row?.count ?? 0) > 0;
}

function randomSlugPrefix(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 6);
}

function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

async function makeUniqueSlug(db: Db, title: string): Promise<string> {
  const base = slugifyTitle(title);
  for (let i = 0; i < 12; i += 1) {
    const prefix = randomSlugPrefix();
    const slug = base ? `${prefix}-${base}` : prefix;
    const [existing] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.slug, slug))
      .limit(1);
    if (!existing) return slug;
  }
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function insertPostTags(
  db: Db,
  postId: string,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) return;
  await db
    .insert(forumPostTags)
    .values(tagIds.map((tagId) => ({ postId, tagId })))
    .onConflictDoNothing();
}

/**
 * 解析访问者；无 session 返回 null。
 * 权益 v1 复用课程 `course:full`，便于日后在本层内部拆 `forum:*` scope。
 */
export async function resolveViewer(args: ServiceArgs): Promise<Viewer | null> {
  const session = await createAuth(args.env).api.getSession({
    headers: args.requestHeaders,
  });
  if (!session) return null;

  const db = getDb(args.env);
  await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      displayName: session.user.name,
    })
    .onConflictDoNothing();

  const [profile] = await db
    .select({
      displayName: profiles.displayName,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  const now = new Date();
  const [entitlement] = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, session.user.id),
        eq(entitlements.scope, DEFAULT_COURSE_ENTITLEMENT),
        lte(entitlements.startsAt, now),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
      ),
    )
    .limit(1);

  return {
    userId: session.user.id,
    displayName: profile?.displayName || session.user.name || "佚名编子",
    role: toForumRole(profile?.role),
    hasForumAccess: Boolean(entitlement),
  };
}

export async function listTags(args: { env: CloudflareEnv }): Promise<Tag[]> {
  const db = getDb(args.env);
  await ensureDefaultTags(db);
  const rows = await db
    .select({ slug: forumTags.slug, name: forumTags.name })
    .from(forumTags)
    .orderBy(asc(forumTags.slug));
  return sortTags(rows.map((row) => ({ slug: row.slug, name: row.name })));
}

export async function listPosts(
  args: ServiceArgs & { tag?: string; cursor?: string; limit?: number },
): Promise<PostListPage | null> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) return null;

  const db = getDb(args.env);
  const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);

  let tag: Tag | null = null;
  if (args.tag !== undefined) {
    if (!isSafeSlug(args.tag)) return { posts: [], nextCursor: null, tag, viewer };
    const [tagRow] = await db
      .select({ slug: forumTags.slug, name: forumTags.name })
      .from(forumTags)
      .where(eq(forumTags.slug, args.tag))
      .limit(1);
    tag = tagRow ? { slug: tagRow.slug, name: tagRow.name } : { slug: args.tag, name: args.tag };
  }

  const rows = await db
    .select({
      id: forumPosts.id,
      slug: forumPosts.slug,
      title: forumPosts.title,
      bodyMd: forumPosts.bodyMd,
      status: forumPosts.status,
      pinnedAt: forumPosts.pinnedAt,
      authorId: forumPosts.authorId,
      createdAt: forumPosts.createdAt,
      displayName: profiles.displayName,
      qqNumber: profiles.qqNumber,
    })
    .from(forumPosts)
    .leftJoin(profiles, eq(forumPosts.authorId, profiles.userId))
    .orderBy(desc(forumPosts.pinnedAt), desc(forumPosts.createdAt));

  const visibleRows = rows.filter((row) =>
    canSeeStatus(viewer, row.status, row.authorId),
  );
  const postIds = visibleRows.map((row) => row.id);
  const tagsByPost = await loadTagsForPosts(db, postIds);
  const commentCounts = await loadPublishedCommentCounts(db, postIds);

  const filteredRows = tag
    ? visibleRows.filter((row) =>
        (tagsByPost.get(row.id) ?? []).some((postTag) => postTag.slug === tag?.slug),
      )
    : visibleRows;

  const startIndex =
    args.cursor && isSafeCursor(args.cursor)
      ? Math.max(filteredRows.findIndex((row) => row.id === args.cursor) + 1, 0)
      : 0;
  const slice = filteredRows.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < filteredRows.length ? slice[slice.length - 1]?.id ?? null : null;

  const posts: PostSummary[] = slice.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: authorOf({
      userId: row.authorId,
      displayName: row.displayName,
      qqNumber: row.qqNumber,
    }),
    tags: tagsByPost.get(row.id) ?? [],
    status: row.status,
    pinned: row.pinnedAt !== null,
    createdAt: toMs(row.createdAt),
    commentCount: commentCounts.get(row.id) ?? 0,
    excerpt:
      row.status === "published" ? excerptOf(row.bodyMd) : removedExcerpt(row.status),
  }));

  return { posts, nextCursor, tag, viewer };
}

export async function getThread(
  args: ServiceArgs & { slug: string },
): Promise<ThreadView | null> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) return null;
  if (!isSafeSlug(args.slug)) return null;

  const db = getDb(args.env);
  const [row] = await db
    .select({
      id: forumPosts.id,
      slug: forumPosts.slug,
      title: forumPosts.title,
      bodyMd: forumPosts.bodyMd,
      status: forumPosts.status,
      pinnedAt: forumPosts.pinnedAt,
      authorId: forumPosts.authorId,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      displayName: profiles.displayName,
      qqNumber: profiles.qqNumber,
    })
    .from(forumPosts)
    .leftJoin(profiles, eq(forumPosts.authorId, profiles.userId))
    .where(eq(forumPosts.slug, args.slug))
    .limit(1);

  if (!row || !canSeeStatus(viewer, row.status, row.authorId)) return null;

  const tagsByPost = await loadTagsForPosts(db, [row.id]);
  const commentRows = await db
    .select({
      id: forumComments.id,
      postId: forumComments.postId,
      authorId: forumComments.authorId,
      bodyMd: forumComments.bodyMd,
      status: forumComments.status,
      createdAt: forumComments.createdAt,
      updatedAt: forumComments.updatedAt,
      displayName: profiles.displayName,
      qqNumber: profiles.qqNumber,
    })
    .from(forumComments)
    .leftJoin(profiles, eq(forumComments.authorId, profiles.userId))
    .where(eq(forumComments.postId, row.id))
    .orderBy(asc(forumComments.createdAt));

  const comments: Comment[] = commentRows
    .filter((comment) => canSeeStatus(viewer, comment.status, comment.authorId))
    .map((comment) => ({
      id: comment.id,
      author: authorOf({
        userId: comment.authorId,
        displayName: comment.displayName,
        qqNumber: comment.qqNumber,
      }),
      bodyMd: comment.status === "published" ? comment.bodyMd : "",
      status: comment.status,
      createdAt: toMs(comment.createdAt),
      updatedAt: toMs(comment.updatedAt),
      canEdit: canEdit(viewer, comment.authorId),
    }));

  return {
    viewer,
    comments,
    post: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      author: authorOf({
        userId: row.authorId,
        displayName: row.displayName,
        qqNumber: row.qqNumber,
      }),
      tags: tagsByPost.get(row.id) ?? [],
      bodyMd: row.status === "published" ? row.bodyMd : "",
      status: row.status,
      pinned: row.pinnedAt !== null,
      createdAt: toMs(row.createdAt),
      updatedAt: toMs(row.updatedAt),
      canEdit: canEdit(viewer, row.authorId),
      canModerate: viewer.role === "admin",
    },
  };
}

export async function createPost(
  args: ServiceArgs & {
    input: { title: string; bodyMd: string; tagSlugs: string[] };
  },
): Promise<WriteResult<{ slug: string }>> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) {
    return { ok: false, reason: "forbidden", message: "需要报名解锁后才能发帖" };
  }

  const db = getDb(args.env);
  const fieldErrors: NonNullable<
    Extract<WriteResult, { ok: false }>["fieldErrors"]
  > = {};
  const titleErr = validateTitle(args.input.title);
  if (titleErr) fieldErrors.title = titleErr;
  const bodyErr = validateBody(args.input.bodyMd);
  if (bodyErr) fieldErrors.bodyMd = bodyErr;
  const tagValidation = await validateTagSlugs(db, args.input.tagSlugs);
  if (tagValidation.error) fieldErrors.tagSlugs = tagValidation.error;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, reason: "invalid", fieldErrors };
  }

  if (await recentlyWrote(db, forumPosts, viewer.userId, POST_RATE_MS)) {
    return { ok: false, reason: "rate_limited", message: "发帖太快了，缓一下再发" };
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const slug = await makeUniqueSlug(db, args.input.title);
  await db.insert(forumPosts).values({
    id,
    slug,
    authorId: viewer.userId,
    title: args.input.title.trim(),
    bodyMd: args.input.bodyMd.trim(),
    status: "published",
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await insertPostTags(db, id, tagValidation.tagIds);

  return { ok: true, slug };
}

export async function addComment(
  args: ServiceArgs & { postId: string; bodyMd: string },
): Promise<WriteResult<{ id: string }>> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) {
    return { ok: false, reason: "forbidden", message: "需要报名解锁后才能回复" };
  }

  const db = getDb(args.env);
  const [post] = await db
    .select({ id: forumPosts.id, status: forumPosts.status })
    .from(forumPosts)
    .where(eq(forumPosts.id, args.postId))
    .limit(1);
  if (!post || post.status !== "published") {
    return { ok: false, reason: "invalid", message: "这个帖子不存在或已关闭" };
  }

  const bodyErr = validateBody(args.bodyMd);
  if (bodyErr) {
    return { ok: false, reason: "invalid", fieldErrors: { bodyMd: bodyErr } };
  }

  if (await recentlyWrote(db, forumComments, viewer.userId, COMMENT_RATE_MS)) {
    return { ok: false, reason: "rate_limited", message: "回复太快了，缓一下" };
  }

  const now = new Date();
  const id = crypto.randomUUID();
  await db.insert(forumComments).values({
    id,
    postId: post.id,
    authorId: viewer.userId,
    bodyMd: args.bodyMd.trim(),
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, id };
}

export async function editPost(
  args: ServiceArgs & { postId: string; patch: PostPatch },
): Promise<WriteResult> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) return { ok: false, reason: "forbidden" };

  const db = getDb(args.env);
  const [post] = await db
    .select({ id: forumPosts.id, authorId: forumPosts.authorId })
    .from(forumPosts)
    .where(eq(forumPosts.id, args.postId))
    .limit(1);
  if (!post) return { ok: false, reason: "invalid", message: "帖子不存在" };
  if (!canEdit(viewer, post.authorId)) {
    return { ok: false, reason: "forbidden", message: "只能编辑自己的帖子" };
  }

  const fieldErrors: NonNullable<
    Extract<WriteResult, { ok: false }>["fieldErrors"]
  > = {};
  if (args.patch.title !== undefined) {
    const e = validateTitle(args.patch.title);
    if (e) fieldErrors.title = e;
  }
  if (args.patch.bodyMd !== undefined) {
    const e = validateBody(args.patch.bodyMd);
    if (e) fieldErrors.bodyMd = e;
  }
  let tagIds: string[] | null = null;
  if (args.patch.tagSlugs !== undefined) {
    const validation = await validateTagSlugs(db, args.patch.tagSlugs);
    if (validation.error) fieldErrors.tagSlugs = validation.error;
    tagIds = validation.tagIds;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, reason: "invalid", fieldErrors };
  }

  await db
    .update(forumPosts)
    .set({
      ...(args.patch.title !== undefined ? { title: args.patch.title.trim() } : {}),
      ...(args.patch.bodyMd !== undefined ? { bodyMd: args.patch.bodyMd.trim() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(forumPosts.id, post.id));

  if (tagIds) {
    await db.delete(forumPostTags).where(eq(forumPostTags.postId, post.id));
    await insertPostTags(db, post.id, tagIds);
  }

  return { ok: true };
}

export async function editComment(
  args: ServiceArgs & { commentId: string; bodyMd: string },
): Promise<WriteResult> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess) return { ok: false, reason: "forbidden" };

  const db = getDb(args.env);
  const [comment] = await db
    .select({ id: forumComments.id, authorId: forumComments.authorId })
    .from(forumComments)
    .where(eq(forumComments.id, args.commentId))
    .limit(1);
  if (!comment) return { ok: false, reason: "invalid", message: "回复不存在" };
  if (!canEdit(viewer, comment.authorId)) {
    return { ok: false, reason: "forbidden", message: "只能编辑自己的回复" };
  }

  const bodyErr = validateBody(args.bodyMd);
  if (bodyErr) {
    return { ok: false, reason: "invalid", fieldErrors: { bodyMd: bodyErr } };
  }

  await db
    .update(forumComments)
    .set({ bodyMd: args.bodyMd.trim(), updatedAt: new Date() })
    .where(eq(forumComments.id, comment.id));

  return { ok: true };
}

export async function moderatePost(
  args: ServiceArgs & { postId: string; action: ModerationAction },
): Promise<WriteResult> {
  const viewer = await resolveViewer(args);
  if (!viewer?.hasForumAccess || viewer.role !== "admin") {
    return { ok: false, reason: "forbidden", message: "仅管理员可操作" };
  }

  const db = getDb(args.env);
  const [post] = await db
    .select({
      id: forumPosts.id,
      status: forumPosts.status,
    })
    .from(forumPosts)
    .where(eq(forumPosts.id, args.postId))
    .limit(1);
  if (!post) return { ok: false, reason: "invalid", message: "帖子不存在" };

  const now = new Date();
  const patch: Partial<ForumPostRow> = { updatedAt: now };
  switch (args.action) {
    case "pin":
      patch.pinnedAt = now;
      break;
    case "unpin":
      patch.pinnedAt = null;
      break;
    case "hide":
      patch.status =
        post.status === "deleted"
          ? "deleted"
          : post.status === "hidden"
            ? "published"
            : "hidden";
      break;
    case "delete":
      patch.status = "deleted";
      break;
  }

  await db.update(forumPosts).set(patch).where(eq(forumPosts.id, post.id));
  return { ok: true };
}
