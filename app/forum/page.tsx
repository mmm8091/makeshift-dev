import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPosts, listTags } from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { ForumListView } from "@/components/forum/forum-list-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "论坛" };

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; view?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  const { cursor, view } = await searchParams;
  const moderation = view === "moderation";

  const page = await listPosts({ env, requestHeaders, cursor, moderation });
  if (!page) return <ForumGate />;
  if (moderation && page.viewer.role !== "admin") notFound();

  const tags = await listTags({ env });

  return (
    <ForumListView
      page={page}
      allTags={tags}
      kicker={moderation ? "管理员 · 工棚" : "识字班 · 工棚"}
      title={moderation ? "论坛管理" : "论坛"}
      subtitle={moderation ? "处理已隐藏、已删除的帖子" : "交作业、问问题、把踩过的坑钉在墙上"}
      basePath={moderation ? "/forum?view=moderation" : "/forum"}
      emptyHint={moderation ? "没有需要处理的下架帖子" : undefined}
      mode={moderation ? "moderation" : "public"}
    />
  );
}
