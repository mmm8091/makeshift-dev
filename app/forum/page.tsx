import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listPosts, listTags } from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { ForumListView } from "@/components/forum/forum-list-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "论坛" };

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  const { cursor } = await searchParams;

  const page = await listPosts({ env, requestHeaders, cursor });
  if (!page) return <ForumGate />;

  const tags = await listTags({ env });

  return (
    <ForumListView
      page={page}
      allTags={tags}
      kicker="识字班 · 工棚"
      title="论坛"
      subtitle="交作业、问问题、把踩过的坑钉在墙上"
      basePath="/forum"
    />
  );
}
