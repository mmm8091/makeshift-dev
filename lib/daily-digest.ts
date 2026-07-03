import { and, eq, gt, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import {
  dailyDigestDeliveries,
  entitlements,
  forumCommentVotes,
  forumComments,
  forumPosts,
  forumPostSubscriptions,
  notificationPreferences,
  user,
} from "../db/schema";
import { sendDirectMail } from "./email/directmail";
import { ENTITLEMENT_SCOPES } from "./entitlements";
import { SITE } from "./site";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type DigestWindow = {
  windowStart: Date;
  windowEnd: Date;
};

type DigestPostReplies = {
  postId: string;
  slug: string;
  title: string;
  count: number;
  snippets: string[];
};

type DigestLikedComment = {
  postSlug: string;
  postTitle: string;
  commentId: string;
  count: number;
  snippet: string;
};

type UserDigest = {
  replies: DigestPostReplies[];
  likedComments: DigestLikedComment[];
};

type DigestRecipient = {
  userId: string;
  email: string;
  name: string;
};

type DigestRunResult = {
  windowStart: number;
  windowEnd: number;
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
};

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_POSTS_PER_EMAIL = 12;
const MAX_LIKED_COMMENTS_PER_EMAIL = 12;

export function previousShanghaiDayWindow(now = new Date()): DigestWindow {
  const shanghaiNow = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const shanghaiTodayStartUtcMs = Date.UTC(
    shanghaiNow.getUTCFullYear(),
    shanghaiNow.getUTCMonth(),
    shanghaiNow.getUTCDate(),
  );
  const windowStartMs = shanghaiTodayStartUtcMs - DAY_MS - SHANGHAI_OFFSET_MS;
  return {
    windowStart: new Date(windowStartMs),
    windowEnd: new Date(windowStartMs + DAY_MS - 1),
  };
}

export async function runDailyDigestForPreviousShanghaiDay({
  env,
  now = new Date(),
}: {
  env: CloudflareEnv;
  now?: Date;
}): Promise<DigestRunResult> {
  return runDailyDigestForWindow({
    env,
    ...previousShanghaiDayWindow(now),
  });
}

export async function runDailyDigestForWindow({
  env,
  windowStart,
  windowEnd,
}: {
  env: CloudflareEnv;
  windowStart: Date;
  windowEnd: Date;
}): Promise<DigestRunResult> {
  const db = drizzle(env.DB, { schema });
  const recipients = await listDigestRecipients(db, env);
  const result: DigestRunResult = {
    windowStart: windowStart.getTime(),
    windowEnd: windowEnd.getTime(),
    candidates: recipients.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const recipient of recipients) {
    const delivery = await beginDelivery(db, recipient.userId, windowStart, windowEnd);
    if (delivery === "sent") {
      result.skipped += 1;
      continue;
    }

    const digest = await buildUserDigest({
      db,
      userId: recipient.userId,
      windowStart,
      windowEnd,
    });
    if (digest.replies.length === 0 && digest.likedComments.length === 0) {
      await finishDelivery(db, recipient.userId, windowStart, windowEnd, "skipped");
      result.skipped += 1;
      continue;
    }

    try {
      await sendDirectMail(
        env,
        await buildDigestEmail({ env, recipient, digest, windowStart }),
      );
      await finishDelivery(db, recipient.userId, windowStart, windowEnd, "sent");
      result.sent += 1;
    } catch (error) {
      await finishDelivery(
        db,
        recipient.userId,
        windowStart,
        windowEnd,
        "failed",
        summarizeEmailError(error),
      );
      result.failed += 1;
    }
  }

  return result;
}

async function listDigestRecipients(
  db: Db,
  env: CloudflareEnv,
): Promise<DigestRecipient[]> {
  const now = new Date();
  const systemUserId = (env as CloudflareEnv & { SYSTEM_USER_ID?: string })
    .SYSTEM_USER_ID?.trim();

  const rows = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .innerJoin(entitlements, eq(user.id, entitlements.userId))
    .leftJoin(notificationPreferences, eq(user.id, notificationPreferences.userId))
    .where(
      and(
        eq(user.emailVerified, true),
        eq(entitlements.scope, ENTITLEMENT_SCOPES.courseFull),
        lte(entitlements.startsAt, now),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
        or(
          isNull(notificationPreferences.userId),
          eq(notificationPreferences.dailyDigestEnabled, true),
        ),
      ),
    );

  const byId = new Map<string, DigestRecipient>();
  for (const row of rows) {
    if (systemUserId && row.userId === systemUserId) continue;
    byId.set(row.userId, {
      userId: row.userId,
      email: row.email,
      name: row.name,
    });
  }
  return [...byId.values()];
}

async function beginDelivery(
  db: Db,
  userId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<"pending" | "sent"> {
  const [existing] = await db
    .select({
      id: dailyDigestDeliveries.id,
      status: dailyDigestDeliveries.status,
    })
    .from(dailyDigestDeliveries)
    .where(
      and(
        eq(dailyDigestDeliveries.userId, userId),
        eq(dailyDigestDeliveries.windowStart, windowStart),
        eq(dailyDigestDeliveries.windowEnd, windowEnd),
      ),
    )
    .limit(1);
  if (existing?.status === "sent") return "sent";

  const now = new Date();
  if (existing) {
    await db
      .update(dailyDigestDeliveries)
      .set({ status: "pending", errorCode: null, updatedAt: now })
      .where(eq(dailyDigestDeliveries.id, existing.id));
    return "pending";
  }

  await db.insert(dailyDigestDeliveries).values({
    id: crypto.randomUUID(),
    userId,
    windowStart,
    windowEnd,
    status: "pending",
    sentAt: null,
    errorCode: null,
    createdAt: now,
    updatedAt: now,
  });
  return "pending";
}

async function finishDelivery(
  db: Db,
  userId: string,
  windowStart: Date,
  windowEnd: Date,
  status: "sent" | "failed" | "skipped",
  errorCode?: string,
) {
  const now = new Date();
  await db
    .update(dailyDigestDeliveries)
    .set({
      status,
      sentAt: status === "sent" ? now : null,
      errorCode: errorCode ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(dailyDigestDeliveries.userId, userId),
        eq(dailyDigestDeliveries.windowStart, windowStart),
        eq(dailyDigestDeliveries.windowEnd, windowEnd),
      ),
    );
}

async function buildUserDigest({
  db,
  userId,
  windowStart,
  windowEnd,
}: {
  db: Db;
  userId: string;
  windowStart: Date;
  windowEnd: Date;
}): Promise<UserDigest> {
  const [replies, likedComments] = await Promise.all([
    listNewReplies({ db, userId, windowStart, windowEnd }),
    listLikedComments({ db, userId, windowStart, windowEnd }),
  ]);
  return { replies, likedComments };
}

async function listNewReplies({
  db,
  userId,
  windowStart,
  windowEnd,
}: {
  db: Db;
  userId: string;
  windowStart: Date;
  windowEnd: Date;
}): Promise<DigestPostReplies[]> {
  const rows = await db
    .select({
      postId: forumPosts.id,
      slug: forumPosts.slug,
      title: forumPosts.title,
      commentId: forumComments.id,
      bodyMd: forumComments.bodyMd,
      createdAt: forumComments.createdAt,
    })
    .from(forumPostSubscriptions)
    .innerJoin(forumPosts, eq(forumPostSubscriptions.postId, forumPosts.id))
    .innerJoin(forumComments, eq(forumPosts.id, forumComments.postId))
    .where(
      and(
        eq(forumPostSubscriptions.userId, userId),
        isNull(forumPostSubscriptions.mutedAt),
        eq(forumPosts.status, "published"),
        eq(forumComments.status, "published"),
        gte(forumComments.createdAt, windowStart),
        lte(forumComments.createdAt, windowEnd),
        sql`${forumComments.authorId} <> ${userId}`,
      ),
    )
    .orderBy(forumPosts.lastActivityAt, forumComments.createdAt);

  const byPost = new Map<string, DigestPostReplies>();
  for (const row of rows) {
    const existing =
      byPost.get(row.postId) ??
      {
        postId: row.postId,
        slug: row.slug,
        title: row.title,
        count: 0,
        snippets: [],
      };
    existing.count += 1;
    if (existing.snippets.length < 2) {
      existing.snippets.push(shortSnippet(row.bodyMd));
    }
    byPost.set(row.postId, existing);
  }

  return [...byPost.values()].slice(0, MAX_POSTS_PER_EMAIL);
}

async function listLikedComments({
  db,
  userId,
  windowStart,
  windowEnd,
}: {
  db: Db;
  userId: string;
  windowStart: Date;
  windowEnd: Date;
}): Promise<DigestLikedComment[]> {
  const rows = await db
    .select({
      postSlug: forumPosts.slug,
      postTitle: forumPosts.title,
      commentId: forumComments.id,
      bodyMd: forumComments.bodyMd,
      count: sql<number>`count(*)`,
    })
    .from(forumCommentVotes)
    .innerJoin(forumComments, eq(forumCommentVotes.commentId, forumComments.id))
    .innerJoin(forumPosts, eq(forumComments.postId, forumPosts.id))
    .innerJoin(
      forumPostSubscriptions,
      and(
        eq(forumPostSubscriptions.postId, forumPosts.id),
        eq(forumPostSubscriptions.userId, userId),
      ),
    )
    .where(
      and(
        isNull(forumPostSubscriptions.mutedAt),
        eq(forumPosts.status, "published"),
        eq(forumComments.status, "published"),
        eq(forumComments.authorId, userId),
        gte(forumCommentVotes.createdAt, windowStart),
        lte(forumCommentVotes.createdAt, windowEnd),
      ),
    )
    .groupBy(
      forumPosts.slug,
      forumPosts.title,
      forumComments.id,
      forumComments.bodyMd,
    );

  return rows
    .map((row) => ({
      postSlug: row.postSlug,
      postTitle: row.postTitle,
      commentId: row.commentId,
      count: Number(row.count),
      snippet: shortSnippet(row.bodyMd),
    }))
    .slice(0, MAX_LIKED_COMMENTS_PER_EMAIL);
}

async function buildDigestEmail({
  env,
  recipient,
  digest,
  windowStart,
}: {
  env: CloudflareEnv;
  recipient: DigestRecipient;
  digest: UserDigest;
  windowStart: Date;
}) {
  const baseUrl =
    (env as CloudflareEnv & { BETTER_AUTH_URL?: string }).BETTER_AUTH_URL ||
    "https://makeshift-dev.digitalleft.org";
  const date = formatShanghaiDate(windowStart);
  const unsubscribeUrl = `${baseUrl}/api/notifications/daily-digest/unsubscribe?token=${encodeURIComponent(
    await createUnsubscribeToken(env, recipient.userId),
  )}`;
  const subject = `${SITE.name} 每日讨论摘要 · ${date}`;
  const textBody = renderTextDigest({ baseUrl, date, digest, unsubscribeUrl });
  const htmlBody = renderHtmlDigest({ baseUrl, date, digest, unsubscribeUrl });

  return {
    to: recipient.email,
    subject,
    textBody,
    htmlBody,
  };
}

function renderTextDigest({
  baseUrl,
  date,
  digest,
  unsubscribeUrl,
}: {
  baseUrl: string;
  date: string;
  digest: UserDigest;
  unsubscribeUrl: string;
}) {
  const lines = [`${SITE.name} 每日讨论摘要 · ${date}`, ""];
  if (digest.replies.length > 0) {
    lines.push("你关注的帖子有新回复：");
    for (const post of digest.replies) {
      lines.push(`- ${post.title}：${post.count} 条新回复`);
      for (const snippet of post.snippets) lines.push(`  · ${snippet}`);
      lines.push(`  ${baseUrl}/forum/t/${post.slug}`);
    }
    lines.push("");
  }
  if (digest.likedComments.length > 0) {
    lines.push("你的回复收到点赞：");
    for (const item of digest.likedComments) {
      lines.push(`- ${item.postTitle}：${item.count} 个赞`);
      lines.push(`  · ${item.snippet}`);
      lines.push(`  ${baseUrl}/forum/t/${item.postSlug}`);
    }
    lines.push("");
  }
  lines.push("管理关注的帖子：登录用户中心查看“关注的帖子”。");
  lines.push(`关闭每日摘要：${unsubscribeUrl}`);
  return lines.join("\n");
}

function renderHtmlDigest({
  baseUrl,
  date,
  digest,
  unsubscribeUrl,
}: {
  baseUrl: string;
  date: string;
  digest: UserDigest;
  unsubscribeUrl: string;
}) {
  const sections: string[] = [
    `<h2>${escapeHtml(SITE.name)} 每日讨论摘要 · ${escapeHtml(date)}</h2>`,
  ];
  if (digest.replies.length > 0) {
    sections.push("<h3>你关注的帖子有新回复</h3>");
    sections.push("<ul>");
    for (const post of digest.replies) {
      sections.push(
        `<li><strong>${escapeHtml(post.title)}</strong>：${post.count} 条新回复<br><a href="${escapeHtml(
          `${baseUrl}/forum/t/${post.slug}`,
        )}">打开讨论</a><ul>${post.snippets
          .map((snippet) => `<li>${escapeHtml(snippet)}</li>`)
          .join("")}</ul></li>`,
      );
    }
    sections.push("</ul>");
  }
  if (digest.likedComments.length > 0) {
    sections.push("<h3>你的回复收到点赞</h3>");
    sections.push("<ul>");
    for (const item of digest.likedComments) {
      sections.push(
        `<li><strong>${escapeHtml(item.postTitle)}</strong>：${item.count} 个赞<br>${escapeHtml(
          item.snippet,
        )}<br><a href="${escapeHtml(`${baseUrl}/forum/t/${item.postSlug}`)}">打开讨论</a></li>`,
      );
    }
    sections.push("</ul>");
  }
  sections.push(
    `<p>管理单个关注的帖子：登录用户中心查看“关注的帖子”。</p><p><a href="${escapeHtml(
      unsubscribeUrl,
    )}">关闭所有每日摘要</a></p>`,
  );
  return sections.join("");
}

export async function createUnsubscribeToken(
  env: CloudflareEnv,
  userId: string,
): Promise<string> {
  const payload = {
    uid: userId,
    purpose: "daily-digest-unsubscribe",
    version: 1,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await signToken(env, body);
  return `${body}.${signature}`;
}

export async function verifyUnsubscribeToken(
  env: CloudflareEnv,
  token: string,
): Promise<string | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!constantTimeEqual(await signToken(env, body), signature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as {
      uid?: unknown;
      purpose?: unknown;
    };
    if (payload.purpose !== "daily-digest-unsubscribe") return null;
    return typeof payload.uid === "string" && payload.uid ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function setDailyDigestPreference({
  env,
  userId,
  enabled,
  unsubscribedAt = null,
}: {
  env: CloudflareEnv;
  userId: string;
  enabled: boolean;
  unsubscribedAt?: Date | null;
}) {
  const db = drizzle(env.DB, { schema });
  const now = new Date();
  await db
    .insert(notificationPreferences)
    .values({
      userId,
      dailyDigestEnabled: enabled,
      unsubscribedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { dailyDigestEnabled: enabled, unsubscribedAt, updatedAt: now },
    });
}

export async function getDailyDigestPreference({
  env,
  userId,
}: {
  env: CloudflareEnv;
  userId: string;
}): Promise<{ dailyDigestEnabled: boolean; unsubscribedAt: number | null }> {
  const db = drizzle(env.DB, { schema });
  const [row] = await db
    .select({
      dailyDigestEnabled: notificationPreferences.dailyDigestEnabled,
      unsubscribedAt: notificationPreferences.unsubscribedAt,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return {
    dailyDigestEnabled: row?.dailyDigestEnabled ?? true,
    unsubscribedAt: row?.unsubscribedAt
      ? row.unsubscribedAt.getTime()
      : null,
  };
}

function shortSnippet(markdown: string) {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_\-~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 80 ? `${stripped.slice(0, 80)}...` : stripped || "（空）";
}

function formatShanghaiDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function summarizeEmailError(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  const status =
    "status" in error && typeof error.status === "number" ? `http_${error.status}` : null;
  return (code ?? status ?? error.name).slice(0, 120);
}

async function signToken(env: CloudflareEnv, body: string) {
  const secret =
    (env as CloudflareEnv & {
      DAILY_DIGEST_SECRET?: string;
      BETTER_AUTH_SECRET?: string;
      REDEEM_CODE_PEPPER?: string;
    }).DAILY_DIGEST_SECRET ||
    (env as CloudflareEnv & { BETTER_AUTH_SECRET?: string }).BETTER_AUTH_SECRET ||
    (env as CloudflareEnv & { REDEEM_CODE_PEPPER?: string }).REDEEM_CODE_PEPPER ||
    "dev";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${secret}:daily-digest`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return arrayBufferToBase64Url(signature);
}

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return base64UrlEncode(binary);
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return atob(padded);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
