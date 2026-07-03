import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import {
  courseDiscussionThreads,
  courseFeedback,
  courseSections,
  forumComments,
  forumCommentVotes,
  forumPosts,
  forumPostSubscriptions,
  forumPostTags,
  forumTags,
  profiles,
} from "@/db/schema";
import { getCourse } from "@/lib/courses";
import { CAPABILITY_SCOPES, hasActiveEntitlement } from "@/lib/entitlements";
import { resolveViewer, type Viewer } from "@/lib/forum";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  formatCourseFeedbackForumBody,
  isFeedbackStatus,
  type CourseDiscussionComment,
  type AdminCourseFeedbackItem,
  type AdminCourseFeedbackOverview,
  type CourseFeedbackInput,
  type CourseFeedbackSummary,
  type CourseFeedbackView,
  type CourseFeedbackWriteResult,
  type FeedbackStatus,
} from "@/lib/course-feedback-types";

export * from "@/lib/course-feedback-types";

type ServiceArgs = {
  env: CloudflareEnv;
  requestHeaders?: Headers;
  viewer?: Viewer;
};

type CourseMeta = {
  slug: string;
  title: string;
};

type DiscussionThread = {
  postId: string;
  postSlug: string;
};

const SAFE_SLUG_RE = /^[a-z0-9-]+$/i;
const COURSE_DISCUSSION_TAG = {
  id: "tag-course-discussion",
  slug: "course-discussion",
  name: "课程讨论",
};
const COURSE_DISCUSSION_BODY =
  "这是系统自动创建的课程讨论帖。这里可以放顺利、难懂、卡住和补充说明；请不要粘贴 token、卡密、邮箱、手机号或其他秘密。";

function toMs(value: Date | number | null): number | null {
  if (value === null) return null;
  return value instanceof Date ? value.getTime() : value;
}

function emptyCounts(): Record<FeedbackStatus, number> {
  return { smooth: 0, confusing: 0, blocked: 0 };
}

function validateInput(input: CourseFeedbackInput) {
  const fieldErrors: NonNullable<
    Extract<CourseFeedbackWriteResult, { ok: false }>["fieldErrors"]
  > = {};

  if (!SAFE_SLUG_RE.test(input.sectionSlug)) {
    fieldErrors.sectionSlug = "课程 slug 无效";
  }
  if (!isFeedbackStatus(input.status)) {
    fieldErrors.status = "请选择这一节的状态";
  }
  const body = input.bodyMd.trim();
  if (!body) {
    fieldErrors.bodyMd = "反馈文字不能为空";
  } else if (body.length > FEEDBACK_BODY_MAX) {
    fieldErrors.bodyMd = `反馈文字不超过 ${FEEDBACK_BODY_MAX} 字`;
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    bodyMd: body,
  };
}

function feedbackView(row: typeof courseFeedback.$inferSelect): CourseFeedbackView {
  return {
    id: row.id,
    sectionSlug: row.sectionSlug,
    status: row.status,
    bodyMd: row.bodyMd,
    forumCommentId: row.forumCommentId,
    withdrawnAt: toMs(row.withdrawnAt),
    createdAt: toMs(row.createdAt) ?? Date.now(),
    updatedAt: toMs(row.updatedAt) ?? Date.now(),
  };
}

function authorOf(row: {
  userId: string;
  displayName: string | null;
  qqNumber: string | null;
}) {
  return {
    userId: row.userId,
    displayName: row.displayName || "佚名编子",
    qq: row.qqNumber,
  };
}

async function resolveFeedbackViewer(args: ServiceArgs): Promise<Viewer | null> {
  const viewer = await resolveViewer(args);
  if (!viewer) return null;

  const db = getDb(args.env);
  const [hasCourseAccess, hasForumAccess] = await Promise.all([
    hasActiveEntitlement(db, viewer.userId, CAPABILITY_SCOPES.course),
    hasActiveEntitlement(db, viewer.userId, CAPABILITY_SCOPES.forum),
  ]);
  if (!hasCourseAccess || !hasForumAccess) return null;
  return { ...viewer, hasForumAccess };
}

async function loadCourseMeta(db: Db, sectionSlug: string): Promise<CourseMeta | null> {
  if (!SAFE_SLUG_RE.test(sectionSlug)) return null;

  const staticCourse = getCourse(sectionSlug);
  if (staticCourse?.available && staticCourse.slug) {
    return { slug: staticCourse.slug, title: staticCourse.title };
  }

  const [row] = await db
    .select({
      slug: courseSections.slug,
      title: courseSections.title,
    })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.slug, sectionSlug),
        eq(courseSections.status, "published"),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function consumeFeedbackWriteLimit(
  env: CloudflareEnv,
  userId: string,
  sectionSlug: string,
): Promise<boolean> {
  const perSection = await consumeRateLimit({
    env,
    namespace: "course-feedback:section:user",
    key: `${userId}:${sectionSlug}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!perSection.ok) return true;

  const perUser = await consumeRateLimit({
    env,
    namespace: "course-feedback:user",
    key: userId,
    limit: 30,
    windowMs: 10 * 60_000,
  });
  return !perUser.ok;
}

function getSystemUserId(env: CloudflareEnv): string | null {
  const value = (env as CloudflareEnv & { SYSTEM_USER_ID?: string }).SYSTEM_USER_ID;
  return value?.trim() || null;
}

async function loadSystemUserId(env: CloudflareEnv, db: Db): Promise<string> {
  const systemUserId = getSystemUserId(env);
  if (!systemUserId) {
    throw new Error("SYSTEM_USER_ID is not configured");
  }

  const [row] = await db
    .select({ userId: profiles.userId, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.userId, systemUserId))
    .limit(1);
  if (!row || row.role !== "admin") {
    throw new Error("SYSTEM_USER_ID must point to an admin profile");
  }
  return row.userId;
}

async function ensureCourseDiscussionTag(db: Db, postId?: string) {
  await db.insert(forumTags).values(COURSE_DISCUSSION_TAG).onConflictDoNothing();
  if (!postId) return;
  await db
    .insert(forumPostTags)
    .values({ postId, tagId: COURSE_DISCUSSION_TAG.id })
    .onConflictDoNothing();
}

async function makeDiscussionSlug(db: Db, sectionSlug: string): Promise<string> {
  const base = `course-discussion-${sectionSlug}`.toLowerCase();
  for (let i = 0; i < 8; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [existing] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function ensureDiscussionThread(
  env: CloudflareEnv,
  db: Db,
  course: CourseMeta,
): Promise<DiscussionThread> {
  const systemUserId = await loadSystemUserId(env, db);
  await ensureCourseDiscussionTag(db);
  const title = `课程讨论：${course.title}`;
  const now = new Date();

  const [existing] = await db
    .select({
      sectionSlug: courseDiscussionThreads.sectionSlug,
      forumPostId: courseDiscussionThreads.forumPostId,
      postSlug: forumPosts.slug,
      postStatus: forumPosts.status,
    })
    .from(courseDiscussionThreads)
    .innerJoin(forumPosts, eq(courseDiscussionThreads.forumPostId, forumPosts.id))
    .where(eq(courseDiscussionThreads.sectionSlug, course.slug))
    .limit(1);

  if (existing && existing.postStatus !== "deleted") {
    await db
      .update(forumPosts)
      .set({
        title,
        bodyMd: COURSE_DISCUSSION_BODY,
        status: "published",
        updatedAt: now,
      })
      .where(eq(forumPosts.id, existing.forumPostId));
    await db
      .update(courseDiscussionThreads)
      .set({ updatedAt: now })
      .where(eq(courseDiscussionThreads.sectionSlug, course.slug));
    await ensureCourseDiscussionTag(db, existing.forumPostId);
    return { postId: existing.forumPostId, postSlug: existing.postSlug };
  }

  const postId = crypto.randomUUID();
  const postSlug = await makeDiscussionSlug(db, course.slug);
  await db.insert(forumPosts).values({
    id: postId,
    slug: postSlug,
    authorId: systemUserId,
    title,
    bodyMd: COURSE_DISCUSSION_BODY,
    status: "published",
    pinnedAt: null,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await ensureCourseDiscussionTag(db, postId);
  await db
    .insert(courseDiscussionThreads)
    .values({
      sectionSlug: course.slug,
      forumPostId: postId,
      createdBy: systemUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: courseDiscussionThreads.sectionSlug,
      set: { forumPostId: postId, createdBy: systemUserId, updatedAt: now },
    });

  return { postId, postSlug };
}

async function loadExistingDiscussion(
  db: Db,
  sectionSlug: string,
): Promise<DiscussionThread | null> {
  const [row] = await db
    .select({
      postId: courseDiscussionThreads.forumPostId,
      postSlug: forumPosts.slug,
    })
    .from(courseDiscussionThreads)
    .innerJoin(forumPosts, eq(courseDiscussionThreads.forumPostId, forumPosts.id))
    .where(
      and(
        eq(courseDiscussionThreads.sectionSlug, sectionSlug),
        eq(forumPosts.status, "published"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCourseDiscussionPostSlug(
  args: ServiceArgs & { sectionSlug: string },
): Promise<string | null> {
  const db = getDb(args.env);
  const discussion = await loadExistingDiscussion(db, args.sectionSlug);
  return discussion?.postSlug ?? null;
}

async function autoFollowDiscussion(db: Db, postId: string, userId: string, now: Date) {
  await db
    .insert(forumPostSubscriptions)
    .values({ postId, userId, mutedAt: null, createdAt: now, updatedAt: now })
    .onConflictDoNothing();
}

async function createSyncedComment({
  db,
  postId,
  userId,
  status,
  bodyMd,
  now,
}: {
  db: Db;
  postId: string;
  userId: string;
  status: FeedbackStatus;
  bodyMd: string;
  now: Date;
}): Promise<string> {
  const commentId = crypto.randomUUID();
  await db.insert(forumComments).values({
    id: commentId,
    postId,
    authorId: userId,
    bodyMd: formatCourseFeedbackForumBody(status, bodyMd),
    status: "published",
    createdAt: now,
    updatedAt: now,
  });
  await db
    .update(forumPosts)
    .set({ lastActivityAt: now, updatedAt: now })
    .where(eq(forumPosts.id, postId));
  await autoFollowDiscussion(db, postId, userId, now);
  return commentId;
}

async function updateSyncedComment({
  db,
  commentId,
  status,
  bodyMd,
  now,
}: {
  db: Db;
  commentId: string;
  status: FeedbackStatus;
  bodyMd: string;
  now: Date;
}): Promise<boolean> {
  const [comment] = await db
    .select({ id: forumComments.id, status: forumComments.status })
    .from(forumComments)
    .where(eq(forumComments.id, commentId))
    .limit(1);
  if (!comment || comment.status !== "published") return false;

  await db
    .update(forumComments)
    .set({
      bodyMd: formatCourseFeedbackForumBody(status, bodyMd),
      updatedAt: now,
    })
    .where(eq(forumComments.id, comment.id));
  return true;
}

async function loadCounts(db: Db, sectionSlug: string) {
  const counts = emptyCounts();
  const rows = await db
    .select({
      status: courseFeedback.status,
      count: sql<number>`count(*)`,
    })
    .from(courseFeedback)
    .where(
      and(
        eq(courseFeedback.sectionSlug, sectionSlug),
        isNull(courseFeedback.withdrawnAt),
      ),
    )
    .groupBy(courseFeedback.status);

  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

async function loadHighlightedComments({
  db,
  postId,
  viewerFeedbackCommentId,
}: {
  db: Db;
  postId: string;
  viewerFeedbackCommentId: string | null;
}): Promise<CourseDiscussionComment[]> {
  const rows = await db
    .select({
      id: forumComments.id,
      authorId: forumComments.authorId,
      bodyMd: forumComments.bodyMd,
      createdAt: forumComments.createdAt,
      updatedAt: forumComments.updatedAt,
      displayName: profiles.displayName,
      qqNumber: profiles.qqNumber,
    })
    .from(forumComments)
    .leftJoin(profiles, eq(forumComments.authorId, profiles.userId))
    .where(
      and(
        eq(forumComments.postId, postId),
        eq(forumComments.status, "published"),
      ),
    )
    .orderBy(desc(forumComments.createdAt))
    .limit(80);

  const commentIds = rows.map((row) => row.id);
  const voteRows =
    commentIds.length === 0
      ? []
      : await db
          .select({
            commentId: forumCommentVotes.commentId,
            count: sql<number>`count(*)`,
          })
          .from(forumCommentVotes)
          .innerJoin(
            forumComments,
            eq(forumCommentVotes.commentId, forumComments.id),
          )
          .where(
            and(
              inArray(forumCommentVotes.commentId, commentIds),
              eq(forumComments.status, "published"),
            ),
          )
          .groupBy(forumCommentVotes.commentId);
  const votes = new Map(voteRows.map((row) => [row.commentId, Number(row.count)]));

  return rows
    .map((row) => ({
      id: row.id,
      author: authorOf({
        userId: row.authorId,
        displayName: row.displayName,
        qqNumber: row.qqNumber,
      }),
      bodyMd: row.bodyMd,
      createdAt: toMs(row.createdAt) ?? Date.now(),
      updatedAt: toMs(row.updatedAt) ?? Date.now(),
      likeCount: votes.get(row.id) ?? 0,
      isViewerFeedback: row.id === viewerFeedbackCommentId,
    }))
    .filter((comment) => !comment.isViewerFeedback)
    .sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt)
    .slice(0, 5);
}

export async function getCourseFeedbackSummary(
  args: ServiceArgs & { sectionSlug: string },
): Promise<CourseFeedbackSummary | null> {
  const viewer = await resolveFeedbackViewer(args);
  if (!viewer) return null;

  const db = getDb(args.env);
  const course = await loadCourseMeta(db, args.sectionSlug);
  if (!course) return null;

  const [counts, viewerRow, discussion] = await Promise.all([
    loadCounts(db, course.slug),
    db
      .select()
      .from(courseFeedback)
      .where(
        and(
          eq(courseFeedback.sectionSlug, course.slug),
          eq(courseFeedback.userId, viewer.userId),
        ),
      )
      .limit(1),
    loadExistingDiscussion(db, course.slug),
  ]);

  const activeViewerFeedback =
    viewerRow[0] && !viewerRow[0].withdrawnAt ? feedbackView(viewerRow[0]) : null;
  const highlightedComments = discussion
    ? await loadHighlightedComments({
        db,
        postId: discussion.postId,
        viewerFeedbackCommentId: activeViewerFeedback?.forumCommentId ?? null,
      })
    : [];
  const total = FEEDBACK_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  return {
    sectionSlug: course.slug,
    counts,
    total,
    viewerFeedback: activeViewerFeedback,
    discussionPostSlug: discussion?.postSlug ?? null,
    highlightedComments,
  };
}

export async function dryRunSubmitCourseFeedback(
  args: ServiceArgs & { input: CourseFeedbackInput },
): Promise<CourseFeedbackWriteResult<{ publicSyncNotice: string }>> {
  const viewer = await resolveFeedbackViewer(args);
  if (!viewer) {
    return { ok: false, reason: "forbidden", message: "需要解锁课程后才能反馈" };
  }

  const validation = validateInput(args.input);
  if (!validation.ok) {
    return { ok: false, reason: "invalid", fieldErrors: validation.fieldErrors };
  }

  const course = await loadCourseMeta(getDb(args.env), args.input.sectionSlug);
  if (!course) {
    return {
      ok: false,
      reason: "invalid",
      fieldErrors: { sectionSlug: "课程不存在或尚未发布" },
    };
  }

  return {
    ok: true,
    publicSyncNotice: "提交后会同步到本节课程讨论帖，其他已解锁学员可见。",
  };
}

export async function submitCourseFeedback(
  args: ServiceArgs & { input: CourseFeedbackInput },
): Promise<CourseFeedbackWriteResult<{ feedbackId: string; discussionLinked: boolean }>> {
  const viewer = await resolveFeedbackViewer(args);
  if (!viewer) {
    return { ok: false, reason: "forbidden", message: "需要解锁课程后才能反馈" };
  }

  const validation = validateInput(args.input);
  if (!validation.ok) {
    return { ok: false, reason: "invalid", fieldErrors: validation.fieldErrors };
  }

  const db = getDb(args.env);
  const course = await loadCourseMeta(db, args.input.sectionSlug);
  if (!course) {
    return {
      ok: false,
      reason: "invalid",
      fieldErrors: { sectionSlug: "课程不存在或尚未发布" },
    };
  }

  if (await consumeFeedbackWriteLimit(args.env, viewer.userId, course.slug)) {
    return { ok: false, reason: "rate_limited", message: "反馈操作太频繁了，稍后再试" };
  }

  const now = new Date();
  const [existing] = await db
    .select()
    .from(courseFeedback)
    .where(
      and(
        eq(courseFeedback.sectionSlug, course.slug),
        eq(courseFeedback.userId, viewer.userId),
      ),
    )
    .limit(1);

  let discussion: DiscussionThread | null = null;
  try {
    discussion = await ensureDiscussionThread(args.env, db, course);
  } catch {
    discussion = null;
  }

  let forumCommentId = existing?.forumCommentId ?? null;
  let discussionLinked = false;
  if (discussion) {
    if (forumCommentId && !existing?.withdrawnAt) {
      discussionLinked = await updateSyncedComment({
        db,
        commentId: forumCommentId,
        status: args.input.status,
        bodyMd: validation.bodyMd,
        now,
      });
    }
    if (!discussionLinked) {
      forumCommentId = await createSyncedComment({
        db,
        postId: discussion.postId,
        userId: viewer.userId,
        status: args.input.status,
        bodyMd: validation.bodyMd,
        now,
      });
      discussionLinked = true;
    }
  }

  if (existing) {
    await db
      .update(courseFeedback)
      .set({
        status: args.input.status,
        bodyMd: validation.bodyMd,
        forumPostId: discussion?.postId ?? existing.forumPostId,
        forumCommentId,
        withdrawnAt: null,
        updatedAt: now,
      })
      .where(eq(courseFeedback.id, existing.id));
    return { ok: true, feedbackId: existing.id, discussionLinked };
  }

  const feedbackId = crypto.randomUUID();
  await db.insert(courseFeedback).values({
    id: feedbackId,
    sectionSlug: course.slug,
    userId: viewer.userId,
    status: args.input.status,
    bodyMd: validation.bodyMd,
    forumPostId: discussion?.postId ?? null,
    forumCommentId,
    withdrawnAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, feedbackId, discussionLinked };
}

export async function withdrawCourseFeedback(
  args: ServiceArgs & { sectionSlug: string },
): Promise<CourseFeedbackWriteResult> {
  const viewer = await resolveFeedbackViewer(args);
  if (!viewer) {
    return { ok: false, reason: "forbidden", message: "需要解锁课程后才能撤回反馈" };
  }
  if (!SAFE_SLUG_RE.test(args.sectionSlug)) {
    return {
      ok: false,
      reason: "invalid",
      fieldErrors: { sectionSlug: "课程 slug 无效" },
    };
  }

  const db = getDb(args.env);
  const course = await loadCourseMeta(db, args.sectionSlug);
  if (!course) {
    return {
      ok: false,
      reason: "invalid",
      fieldErrors: { sectionSlug: "课程不存在或尚未发布" },
    };
  }
  if (await consumeFeedbackWriteLimit(args.env, viewer.userId, course.slug)) {
    return { ok: false, reason: "rate_limited", message: "反馈操作太频繁了，稍后再试" };
  }

  const [existing] = await db
    .select()
    .from(courseFeedback)
    .where(
      and(
        eq(courseFeedback.sectionSlug, course.slug),
        eq(courseFeedback.userId, viewer.userId),
      ),
    )
    .limit(1);
  if (!existing || existing.withdrawnAt) {
    return { ok: true };
  }

  const now = new Date();
  await db
    .update(courseFeedback)
    .set({ withdrawnAt: now, updatedAt: now })
    .where(eq(courseFeedback.id, existing.id));

  if (existing.forumCommentId) {
    await db
      .update(forumComments)
      .set({ status: "hidden", updatedAt: now })
      .where(eq(forumComments.id, existing.forumCommentId));
  }

  return { ok: true };
}

export async function listCourseFeedbackOverviewForAdmin(
  args: ServiceArgs,
): Promise<AdminCourseFeedbackOverview[] | null> {
  const viewer = await resolveViewer(args);
  if (!viewer) return null;
  if (viewer.role !== "admin") return null;

  const db = getDb(args.env);
  const [courseRows, countRows, latestRows] = await Promise.all([
    db
      .select({
        slug: courseSections.slug,
        title: courseSections.title,
        orderIndex: courseSections.orderIndex,
      })
      .from(courseSections)
      .where(eq(courseSections.status, "published")),
    db
      .select({
        sectionSlug: courseFeedback.sectionSlug,
        status: courseFeedback.status,
        count: sql<number>`count(*)`,
      })
      .from(courseFeedback)
      .where(isNull(courseFeedback.withdrawnAt))
      .groupBy(courseFeedback.sectionSlug, courseFeedback.status),
    db
      .select({
        sectionSlug: courseFeedback.sectionSlug,
        latestFeedbackAt: sql<number>`max(${courseFeedback.updatedAt})`,
      })
      .from(courseFeedback)
      .where(isNull(courseFeedback.withdrawnAt))
      .groupBy(courseFeedback.sectionSlug),
  ]);

  const rowsBySlug = new Map<string, AdminCourseFeedbackOverview>();
  for (const staticCourse of ["preface", "01-will"]) {
    const course = getCourse(staticCourse);
    if (!course?.slug) continue;
    rowsBySlug.set(course.slug, {
      sectionSlug: course.slug,
      title: course.title,
      orderIndex: course.order,
      counts: emptyCounts(),
      total: 0,
      latestFeedbackAt: null,
    });
  }
  for (const row of courseRows) {
    rowsBySlug.set(row.slug, {
      sectionSlug: row.slug,
      title: row.title,
      orderIndex: row.orderIndex,
      counts: emptyCounts(),
      total: 0,
      latestFeedbackAt: null,
    });
  }
  for (const row of countRows) {
    const entry =
      rowsBySlug.get(row.sectionSlug) ??
      {
        sectionSlug: row.sectionSlug,
        title: getCourse(row.sectionSlug)?.title ?? row.sectionSlug,
        orderIndex: 9999,
        counts: emptyCounts(),
        total: 0,
        latestFeedbackAt: null,
      };
    entry.counts[row.status] = Number(row.count);
    entry.total += Number(row.count);
    rowsBySlug.set(row.sectionSlug, entry);
  }
  const latestBySlug = new Map(
    latestRows.map((row) => [row.sectionSlug, Number(row.latestFeedbackAt)]),
  );
  for (const entry of rowsBySlug.values()) {
    entry.latestFeedbackAt = latestBySlug.get(entry.sectionSlug) ?? null;
  }

  return [...rowsBySlug.values()].sort(
    (a, b) => a.orderIndex - b.orderIndex || a.sectionSlug.localeCompare(b.sectionSlug),
  );
}

export async function listCourseFeedbackForAdmin(
  args: ServiceArgs & { sectionSlug: string },
): Promise<{
  sectionSlug: string;
  title: string;
  counts: Record<FeedbackStatus, number>;
  total: number;
  feedback: AdminCourseFeedbackItem[];
  discussionPostSlug: string | null;
} | null> {
  const viewer = await resolveViewer(args);
  if (!viewer) return null;
  if (viewer.role !== "admin") return null;
  if (!SAFE_SLUG_RE.test(args.sectionSlug)) return null;

  const db = getDb(args.env);
  const course = await loadCourseMeta(db, args.sectionSlug);
  const counts = await loadCounts(db, args.sectionSlug);
  const total = FEEDBACK_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const discussion = await loadExistingDiscussion(db, args.sectionSlug);
  const rows = await db
    .select({
      id: courseFeedback.id,
      sectionSlug: courseFeedback.sectionSlug,
      userId: courseFeedback.userId,
      status: courseFeedback.status,
      bodyMd: courseFeedback.bodyMd,
      forumPostId: courseFeedback.forumPostId,
      forumCommentId: courseFeedback.forumCommentId,
      withdrawnAt: courseFeedback.withdrawnAt,
      createdAt: courseFeedback.createdAt,
      updatedAt: courseFeedback.updatedAt,
      displayName: profiles.displayName,
      qqNumber: profiles.qqNumber,
    })
    .from(courseFeedback)
    .leftJoin(profiles, eq(courseFeedback.userId, profiles.userId))
    .where(eq(courseFeedback.sectionSlug, args.sectionSlug))
    .orderBy(desc(courseFeedback.updatedAt))
    .limit(200);

  return {
    sectionSlug: args.sectionSlug,
    title: course?.title ?? getCourse(args.sectionSlug)?.title ?? args.sectionSlug,
    counts,
    total,
    discussionPostSlug: discussion?.postSlug ?? null,
    feedback: rows.map((row) => ({
      id: row.id,
      sectionSlug: row.sectionSlug,
      status: row.status,
      bodyMd: row.bodyMd,
      forumCommentId: row.forumCommentId,
      withdrawnAt: toMs(row.withdrawnAt),
      createdAt: toMs(row.createdAt) ?? Date.now(),
      updatedAt: toMs(row.updatedAt) ?? Date.now(),
      author: authorOf({
        userId: row.userId,
        displayName: row.displayName,
        qqNumber: row.qqNumber,
      }),
    })),
  };
}
