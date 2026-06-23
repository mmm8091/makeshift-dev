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

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profiles),
  sessions: many(session),
  accounts: many(account),
  entitlements: many(entitlements),
  posts: many(forumPosts),
  comments: many(forumComments),
}));

export const profileRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));
