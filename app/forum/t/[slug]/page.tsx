import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getThread,
  listTags,
  resolveViewer,
  type ContentStatus,
} from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { ForumMarkdown } from "@/components/forum/forum-markdown";
import { AuthorByline } from "@/components/forum/author-byline";
import { TagChips } from "@/components/forum/tag-chips";
import { ModerationBar } from "@/components/forum/moderation-bar";
import { PostBodyEditable } from "@/components/forum/post-body-editable";
import { CommentItem } from "@/components/forum/comment-item";
import { CommentComposer } from "@/components/forum/comment-composer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const thread = await getThread({ env, requestHeaders: await headers(), slug });
  return { title: thread?.post.title ?? "帖子" };
}

/** 隐藏/删除的占位（管理员/作者才会走到这里）。 */
function RemovedNotice({ status }: { status: ContentStatus }) {
  return (
    <div className="mt-6 border-2 border-dashed border-red bg-paper-2 p-6 font-serif text-ink-soft">
      {status === "hidden" ? "这个内容已被隐藏，仅管理员可见占位" : "这个内容已被删除"}
    </div>
  );
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();

  // 先用 resolveViewer 决定 Gate：无权限一律 Gate，不区分帖子是否存在，避免探测。
  const viewer = await resolveViewer({ env, requestHeaders });
  if (!viewer?.hasForumAccess) return <ForumGate />;

  const thread = await getThread({ env, requestHeaders, slug });
  if (!thread) notFound();

  const allTags = await listTags({ env });
  const { post, comments } = thread;
  const published = post.status === "published";
  const publishedComments = comments.filter((c) => c.status === "published");

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <p className="kicker">工棚 · 帖子</p>
        <Link
          href="/forum"
          className="font-serif text-sm font-semibold text-ink-soft hover:text-red"
        >
          返回论坛 →
        </Link>
      </div>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && (
            <span className="border-2 border-gold bg-[rgba(215,168,63,0.14)] px-2 py-0.5 font-serif text-xs font-bold text-gold">
              置顶
            </span>
          )}
          {!published && (
            <span className="border-2 border-red px-2 py-0.5 font-serif text-xs font-bold text-red">
              {post.status === "hidden" ? "已隐藏" : "已删除"}
            </span>
          )}
          <TagChips tags={post.tags} />
        </div>
        <h1 className="misprint mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4">
          <AuthorByline
            author={post.author}
            when={post.createdAt}
            edited={post.updatedAt > post.createdAt}
          />
        </div>
      </header>

      {post.canModerate && (
        <ModerationBar
          postId={post.id}
          slug={post.slug}
          pinned={post.pinned}
          hidden={post.status === "hidden"}
        />
      )}

      <div className="mt-6 rule-ink" />

      {published ? (
        <PostBodyEditable
          canEdit={post.canEdit}
          postId={post.id}
          slug={post.slug}
          rawBody={post.bodyMd}
          title={post.title}
          tags={allTags}
          tagSlugs={post.tags.map((t) => t.slug)}
        >
          <ForumMarkdown markdown={post.bodyMd} />
        </PostBodyEditable>
      ) : (
        <RemovedNotice status={post.status} />
      )}

      <section className="mt-14 border-t-2 border-ink pt-8">
        <h2 className="font-display text-2xl font-black">
          {publishedComments.length > 0
            ? `${publishedComments.length} 条回复`
            : "还没有回复"}
        </h2>

        {publishedComments.length > 0 && (
          <ul className="mt-4">
            {comments.map((c) =>
              c.status === "published" ? (
                <CommentItem
                  key={c.id}
                  canEdit={c.canEdit}
                  commentId={c.id}
                  slug={post.slug}
                  rawBody={c.bodyMd}
                  byline={
                    <AuthorByline
                      author={c.author}
                      when={c.createdAt}
                      edited={c.updatedAt > c.createdAt}
                      size="sm"
                    />
                  }
                >
                  <ForumMarkdown markdown={c.bodyMd} />
                </CommentItem>
              ) : null,
            )}
          </ul>
        )}

        {published ? (
          <div className="mt-8 border-2 border-ink bg-paper-2 p-5">
            <p className="kicker mb-3">回复</p>
            <CommentComposer mode="create" slug={post.slug} postId={post.id} />
          </div>
        ) : (
          <p className="mt-6 font-serif text-ink-faint">这个帖子已关闭回复</p>
        )}
      </section>
    </article>
  );
}
