import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listTags, resolveViewer } from "@/lib/forum";
import { ForumGate } from "@/components/forum/forum-gate";
import { PostComposer } from "@/components/forum/post-composer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "发帖" };

export default async function NewPostPage() {
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();

  const viewer = await resolveViewer({ env, requestHeaders });
  if (!viewer?.hasForumAccess) return <ForumGate />;

  const tags = await listTags({ env });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <p className="kicker">开一帖</p>
        <Link
          href="/forum"
          className="font-serif text-sm font-semibold text-ink-soft hover:text-red"
        >
          返回论坛 →
        </Link>
      </div>
      <h1 className="misprint mt-3 font-display text-4xl font-black">发帖</h1>
      <p className="ink-bold mt-2 font-serif text-ink-soft">
        以 {viewer.displayName} 的身份发布
      </p>

      <div className="mt-8">
        <PostComposer mode="create" tags={tags} />
      </div>
    </div>
  );
}
