import Link from "next/link";
import type { PostListPage, Tag } from "@/lib/forum";
import { PostList } from "@/components/forum/post-list";
import { TagChips } from "@/components/forum/tag-chips";

/**
 * 列表页外壳，/forum 与 /forum/tag/[tag] 共用。
 * 负责眉标 / 标题 / 发帖入口 / 标签筛选条 / 列表 / 翻页。
 */
export function ForumListView({
  page,
  allTags,
  kicker,
  title,
  subtitle,
  activeTagSlug,
  basePath,
  emptyHint,
  mode = "public",
}: {
  page: PostListPage;
  allTags: Tag[];
  kicker: string;
  title: string;
  subtitle?: string;
  activeTagSlug?: string;
  basePath: string;
  emptyHint?: string;
  mode?: "public" | "moderation";
}) {
  const isAdmin = page.viewer.role === "admin";
  const cursorPrefix = basePath.includes("?") ? "&" : "?";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{kicker}</p>
          <h1 className="misprint mt-2 font-display text-4xl font-black">
            {title}
          </h1>
          {subtitle && (
            <p className="ink-bold mt-2 font-serif text-ink-soft">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Link
              href={mode === "moderation" ? "/forum" : "/forum?view=moderation"}
              className="border-2 border-ink bg-paper px-4 py-2.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              {mode === "moderation" ? "返回论坛" : "管理视图"}
            </Link>
          )}
          <Link
            href="/forum/new"
            className="border-2 border-ink bg-ink px-5 py-2.5 font-bold text-paper transition-colors hover:border-red hover:bg-red"
          >
            发帖 +
          </Link>
        </div>
      </header>

      {mode === "public" && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-y-2 border-edge py-3">
          <Link
            href="/forum"
            className={`border-2 px-2.5 py-0.5 font-serif text-xs font-bold transition-colors ${
              activeTagSlug
                ? "border-edge bg-paper text-ink-soft hover:border-ink hover:text-ink"
                : "border-ink bg-ink text-paper"
            }`}
          >
            全部
          </Link>
          <TagChips tags={allTags} activeSlug={activeTagSlug} />
        </div>
      )}

      <div className="mt-6">
        <PostList
          posts={page.posts}
          emptyHint={emptyHint}
          showManagementActions={mode === "moderation"}
        />
      </div>

      {page.nextCursor && (
        <div className="mt-8 text-center">
          <Link
            href={`${basePath}${cursorPrefix}cursor=${page.nextCursor}`}
            className="inline-flex border-2 border-ink bg-paper px-5 py-2.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            看更多 →
          </Link>
        </div>
      )}
    </div>
  );
}
