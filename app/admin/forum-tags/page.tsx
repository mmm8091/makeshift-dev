import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ForumTagAdminPanel } from "@/components/admin/forum-tag-admin-panel";
import { listTagsForAdmin, resolveViewer } from "@/lib/forum";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "论坛标签管理" };

export default async function ForumTagsAdminPage() {
  const { env } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  const viewer = await resolveViewer({ env, requestHeaders });

  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") redirect("/me");

  const tags = await listTagsForAdmin({ env, requestHeaders });
  if (!tags) redirect("/me");

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">后台</p>
          <h1 className="mt-2 font-display text-4xl font-black">论坛标签</h1>
          <p className="mt-3 font-serif text-base text-ink-soft">
            新增、改名、隐藏论坛标签；学员只能选择未隐藏标签。
          </p>
        </div>
        <Link
          href="/me"
          className="inline-flex border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          返回用户中心
        </Link>
      </div>

      <ForumTagAdminPanel tags={tags} />
    </div>
  );
}
