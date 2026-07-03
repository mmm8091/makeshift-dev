import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

// Better Auth core tables use the default model and field names.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(nowMs),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(nowMs),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  githubUsername: text("github_username"),
  qqNumber: text("qq_number"),
  bio: text("bio"),
  role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs),
});

export const redeemCodes = sqliteTable(
  "redeem_codes",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull(),
    batchId: text("batch_id"),
    entitlementScope: text("entitlement_scope").notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    disabledAt: integer("disabled_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("redeem_codes_code_hash_unique").on(table.codeHash),
    index("redeem_codes_batch_id_idx").on(table.batchId),
  ],
);

export const redeemCodeUses = sqliteTable(
  "redeem_code_uses",
  {
    id: text("id").primaryKey(),
    redeemCodeId: text("redeem_code_id")
      .notNull()
      .references(() => redeemCodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    usedAt: integer("used_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
  },
  (table) => [
    uniqueIndex("redeem_code_uses_code_user_unique").on(
      table.redeemCodeId,
      table.userId,
    ),
    index("redeem_code_uses_code_id_idx").on(table.redeemCodeId),
    index("redeem_code_uses_user_id_idx").on(table.userId),
  ],
);

export const entitlements = sqliteTable(
  "entitlements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("entitlements_user_scope_unique").on(table.userId, table.scope),
    index("entitlements_user_id_idx").on(table.userId),
  ],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    id: text("id").primaryKey(),
    namespace: text("namespace").notNull(),
    keyHash: text("key_hash").notNull(),
    windowStartedAt: integer("window_started_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    count: integer("count").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("rate_limits_namespace_idx").on(table.namespace),
    index("rate_limits_updated_at_idx").on(table.updatedAt),
  ],
);

export const agentAccessTokens = sqliteTable(
  "agent_access_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    scopes: text("scopes").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    lastUsedIpHash: text("last_used_ip_hash"),
    lastUsedUserAgentHash: text("last_used_user_agent_hash"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("agent_access_tokens_hash_unique").on(table.tokenHash),
    index("agent_access_tokens_user_id_idx").on(table.userId),
    index("agent_access_tokens_revoked_idx").on(table.revokedAt),
    index("agent_access_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const agentAccessAuditLogs = sqliteTable(
  "agent_access_audit_logs",
  {
    id: text("id").primaryKey(),
    tokenId: text("token_id").references(() => agentAccessTokens.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    surface: text("surface", { enum: ["mcp", "api"] }).notNull(),
    action: text("action").notNull(),
    outcome: text("outcome", {
      enum: ["ok", "denied", "error", "rate_limited"],
    }).notNull(),
    scope: text("scope"),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("agent_access_audit_logs_token_id_idx").on(table.tokenId),
    index("agent_access_audit_logs_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("agent_access_audit_logs_surface_created_idx").on(
      table.surface,
      table.createdAt,
    ),
  ],
);

export const courseSections = sqliteTable(
  "course_sections",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    bodyMd: text("body_md"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    visibility: text("visibility", { enum: ["public", "locked"] })
      .notNull()
      .default("locked"),
    requiredEntitlement: text("required_entitlement"),
    orderIndex: integer("order_index").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("course_sections_slug_unique").on(table.slug),
    index("course_sections_status_visibility_idx").on(
      table.status,
      table.visibility,
    ),
    index("course_sections_order_idx").on(table.orderIndex),
  ],
);

export const courseAssets = sqliteTable(
  "course_assets",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => courseSections.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    alt: text("alt"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [index("course_assets_section_id_idx").on(table.sectionId)],
);

export const courseDiscussionThreads = sqliteTable(
  "course_discussion_threads",
  {
    sectionSlug: text("section_slug").primaryKey(),
    forumPostId: text("forum_post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("course_discussion_threads_post_unique").on(table.forumPostId),
  ],
);

export const courseFeedback = sqliteTable(
  "course_feedback",
  {
    id: text("id").primaryKey(),
    sectionSlug: text("section_slug").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["smooth", "confusing", "blocked"],
    }).notNull(),
    bodyMd: text("body_md").notNull(),
    forumPostId: text("forum_post_id").references(() => forumPosts.id, {
      onDelete: "set null",
    }),
    forumCommentId: text("forum_comment_id").references(() => forumComments.id, {
      onDelete: "set null",
    }),
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("course_feedback_section_user_unique").on(
      table.sectionSlug,
      table.userId,
    ),
    index("course_feedback_section_status_idx").on(
      table.sectionSlug,
      table.status,
      table.withdrawnAt,
    ),
    index("course_feedback_forum_comment_idx").on(table.forumCommentId),
    index("course_feedback_updated_idx").on(table.updatedAt),
  ],
);

export const forumPosts = sqliteTable(
  "forum_posts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    status: text("status", { enum: ["published", "hidden", "deleted"] })
      .notNull()
      .default("published"),
    pinnedAt: integer("pinned_at", { mode: "timestamp_ms" }),
    lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("forum_posts_slug_unique").on(table.slug),
    index("forum_posts_author_id_idx").on(table.authorId),
    index("forum_posts_status_pinned_idx").on(table.status, table.pinnedAt),
    index("forum_posts_last_activity_idx").on(table.lastActivityAt),
  ],
);

export const forumComments = sqliteTable(
  "forum_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bodyMd: text("body_md").notNull(),
    status: text("status", { enum: ["published", "hidden", "deleted"] })
      .notNull()
      .default("published"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("forum_comments_post_id_idx").on(table.postId),
    index("forum_comments_author_id_idx").on(table.authorId),
  ],
);

export const forumTags = sqliteTable("forum_tags", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
});

export const forumPostTags = sqliteTable(
  "forum_post_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => forumTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("forum_post_tags_tag_id_idx").on(table.tagId),
  ],
);

export const forumCommentVotes = sqliteTable(
  "forum_comment_votes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => forumComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: integer("value").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId] }),
    index("forum_comment_votes_user_id_idx").on(table.userId),
  ],
);

export const forumPostSubscriptions = sqliteTable(
  "forum_post_subscriptions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mutedAt: integer("muted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("forum_post_subscriptions_user_active_idx").on(
      table.userId,
      table.mutedAt,
    ),
  ],
);

export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyDigestEnabled: integer("daily_digest_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs),
});

export const dailyDigestDeliveries = sqliteTable(
  "daily_digest_deliveries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    windowEnd: integer("window_end", { mode: "timestamp_ms" }).notNull(),
    status: text("status", {
      enum: ["pending", "sent", "failed", "skipped"],
    }).notNull(),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    errorCode: text("error_code"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("daily_digest_deliveries_user_window_unique").on(
      table.userId,
      table.windowStart,
      table.windowEnd,
    ),
    index("daily_digest_deliveries_status_idx").on(table.status),
  ],
);

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profiles),
  sessions: many(session),
  accounts: many(account),
  entitlements: many(entitlements),
  posts: many(forumPosts),
  comments: many(forumComments),
  commentVotes: many(forumCommentVotes),
  postSubscriptions: many(forumPostSubscriptions),
  notificationPreference: one(notificationPreferences),
  dailyDigestDeliveries: many(dailyDigestDeliveries),
}));

export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));
