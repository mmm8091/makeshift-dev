import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listPosts, listTags } from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { ForumListView } from "@/components/forum/forum-list-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `标签 · ${decodeURIComponent(tag)}` };
}

export default async function ForumTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { tag } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  const { cursor } = await searchParams;

  const page = await listPosts({ env, requestHeaders, tag, cursor });
  if (!page) return <ForumGate />;

  const tags = await listTags({ env });
  const tagName = page.tag?.name ?? tag;

  return (
    <ForumListView
      page={page}
      allTags={tags}
      kicker="标签"
      title={tagName}
      subtitle={`带「${tagName}」标签的帖子`}
      activeTagSlug={tag}
      basePath={`/forum/tag/${tag}`}
      emptyHint="这个标签下还没有帖子"
    />
  );
}
