import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listFollowedPosts, listTags } from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { ForumListView } from "@/components/forum/forum-list-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "关注的帖子" };

export default async function FollowedPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  const { cursor } = await searchParams;

  const page = await listFollowedPosts({ env, requestHeaders, cursor });
  if (!page) return <ForumGate />;

  const tags = await listTags({ env });
  return (
    <ForumListView
      page={page}
      allTags={tags}
      kicker="用户中心 · 关注"
      title="关注的帖子"
      subtitle="你关心的讨论，后续会进入每日摘要"
      basePath="/me/followed-posts"
      emptyHint="还没有关注帖子；发帖、首次回复或提交课程反馈后会自动关注"
      showTagFilter={false}
    />
  );
}
