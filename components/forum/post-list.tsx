import Link from "next/link";
import type { PostSummary } from "@/lib/forum";
import { AuthorByline } from "@/components/forum/author-byline";
import { TagChips } from "@/components/forum/tag-chips";
import { RestorePostButton } from "@/components/forum/restore-post-button";

/** 帖子状态徽记：仅在管理员视图会看到非 published 的帖子。 */
function StatusBadge({ status }: { status: PostSummary["status"] }) {
  if (status === "published") return null;
  const label = status === "hidden" ? "已隐藏" : "已删除";
  return (
    <span className="border-2 border-red px-2 py-0.5 font-serif text-xs font-bold text-red">
      {label}
    </span>
  );
}

function PostCard({
  post,
  showManagementActions,
}: {
  post: PostSummary;
  showManagementActions: boolean;
}) {
  const muted = post.status !== "published";
  return (
    <li>
      <article
        className={`border-2 border-edge bg-paper-2 p-5 transition-colors hover:border-ink ${
          muted ? "opacity-70" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && (
            <span className="border-2 border-gold bg-[rgba(215,168,63,0.14)] px-2 py-0.5 font-serif text-xs font-bold text-gold">
              置顶
            </span>
          )}
          <StatusBadge status={post.status} />
          <TagChips tags={post.tags} />
        </div>

        <h2 className="mt-3 font-display text-xl font-extrabold leading-snug">
          <Link href={`/forum/t/${post.slug}`} className="hover:text-red">
            {post.title}
          </Link>
        </h2>

        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 font-serif text-sm text-ink-soft">
            {post.excerpt}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AuthorByline author={post.author} when={post.createdAt} size="sm" />
          <div className="flex items-center gap-3">
            {showManagementActions && post.status !== "published" && (
              <RestorePostButton postId={post.id} slug={post.slug} />
            )}
            <span className="font-serif text-xs text-ink-faint">
              {post.commentCount > 0 ? `${post.commentCount} 条回复` : "还没人回"}
            </span>
          </div>
        </div>
      </article>
    </li>
  );
}

export function PostList({
  posts,
  emptyHint = "还没有帖子，来开第一帖",
  showManagementActions = false,
}: {
  posts: PostSummary[];
  emptyHint?: string;
  showManagementActions?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="border-2 border-dashed border-edge bg-paper-2 p-10 text-center font-serif text-ink-soft">
        {emptyHint}
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          showManagementActions={showManagementActions}
        />
      ))}
    </ul>
  );
}
