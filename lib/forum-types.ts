/**
 * 论坛契约的**纯类型与共享常量**（client-safe）。
 *
 * 从 `lib/forum.ts` 拆出来，专放可被客户端组件 import 的东西（计字上限、类型）。
 * `lib/forum.ts` 是 `server-only` 的服务层实现，客户端组件不能 import 它，
 * 但能从这里拿类型与常量，保证「前后端与表单共用一处」又不破坏 server 边界。
 *
 * 契约见 docs/草台编子识字班论坛v1实现规格.md §4 / §4.1。
 */

// 服务层强制的上限（规格 §3）
export const TITLE_MAX = 120;
export const BODY_MAX = 20000;
export const MAX_TAGS = 5;

export type ForumRole = "student" | "admin";

/** 已鉴权的访问者上下文：第 2 轮由 session + profiles + entitlement 解析得出。 */
export type Viewer = {
  userId: string;
  displayName: string;
  role: ForumRole;
  /** v1 即「持有 course:full」。无权限时读函数返回 null，页面渲染 Gate。 */
  hasForumAccess: boolean;
};

export type Tag = {
  slug: string;
  name: string;
};

export type ForumTagAdmin = Tag & {
  id: string;
  hidden: boolean;
  hiddenAt: number | null;
  postCount: number;
};

export type ForumTagFieldErrors = {
  name?: string;
  slug?: string;
};

export type ForumTagWriteResult<T = Record<never, never>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      reason: WriteFailReason;
      message?: string;
      fieldErrors?: ForumTagFieldErrors;
    };

/** 帖子/回复作者的展示信息；头像走 /api/avatar/qq/:qq，无 QQ 用默认。 */
export type Author = {
  userId: string;
  displayName: string;
  qq: string | null;
};

export type ContentStatus = "published" | "hidden" | "deleted";

/** 列表项：不含正文，只给摘要，避免列表页接触全文。 */
export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  author: Author;
  tags: Tag[];
  /** 普通用户只会拿到 published；管理员视图可见 hidden/deleted 以便处理。 */
  status: ContentStatus;
  pinned: boolean;
  createdAt: number; // epoch ms
  commentCount: number;
  /** 服务层裁出的纯文本预览，已去除 Markdown 控制符。 */
  excerpt: string;
};

export type PostListPage = {
  posts: PostSummary[];
  nextCursor: string | null;
  /** 当前筛选标签（/forum/tag/[tag]）；无筛选为 null。 */
  tag: Tag | null;
  viewer: Viewer;
};

export type Comment = {
  id: string;
  author: Author;
  bodyMd: string;
  status: ContentStatus;
  createdAt: number;
  updatedAt: number;
  /** 作者本人或管理员。 */
  canEdit: boolean;
};

export type ThreadPost = {
  id: string;
  slug: string;
  title: string;
  author: Author;
  tags: Tag[];
  bodyMd: string;
  status: ContentStatus;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** 作者本人或管理员。 */
  canEdit: boolean;
  /** 仅管理员（置顶 / 隐藏 / 删除）。 */
  canModerate: boolean;
};

export type ThreadView = {
  post: ThreadPost;
  comments: Comment[];
  viewer: Viewer;
};

export type ModerationAction = "pin" | "unpin" | "hide" | "delete";

export type PostPatch = {
  title?: string;
  bodyMd?: string;
  tagSlugs?: string[];
};

/** 写函数失败原因（闭集）。 */
export type WriteFailReason = "forbidden" | "rate_limited" | "invalid";

/**
 * 写结果判别式。
 * `invalid` 时带 `fieldErrors` 供表单逐字段回显——UI 反向定稿的契约补充（规格 §4.1）。
 */
export type WriteResult<T = Record<never, never>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      reason: WriteFailReason;
      message?: string;
      fieldErrors?: Partial<Record<"title" | "bodyMd" | "tagSlugs", string>>;
    };
