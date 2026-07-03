import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { listCourseFeedbackOverviewForAdmin } from "@/lib/course-feedback";
import { FEEDBACK_STATUS_LABELS, FEEDBACK_STATUSES } from "@/lib/course-feedback-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "课程反馈统计" };

export default async function CourseFeedbackAdminPage() {
  const { env } = await getCloudflareContext({ async: true });
  const rows = await listCourseFeedbackOverviewForAdmin({
    env,
    requestHeaders: await headers(),
  });
  if (!rows) redirect("/me");

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">后台</p>
          <h1 className="mt-2 font-display text-4xl font-black">课程反馈</h1>
          <p className="mt-3 font-serif text-base text-ink-soft">
            只按当前有效反馈统计；撤回的反馈不进入这里的计数。
          </p>
        </div>
        <Link
          href="/me"
          className="inline-flex border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          返回用户中心
        </Link>
      </div>

      <div className="overflow-x-auto border-2 border-ink bg-paper">
        <table className="w-full min-w-[760px] border-collapse font-serif">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 text-left">课程</th>
              <th className="px-4 py-3 text-left">总数</th>
              {FEEDBACK_STATUSES.map((status) => (
                <th key={status} className="px-4 py-3 text-left">
                  {FEEDBACK_STATUS_LABELS[status]}
                </th>
              ))}
              <th className="px-4 py-3 text-left">最近反馈</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sectionSlug} className="border-t-2 border-edge">
                <td className="px-4 py-3">
                  <p className="font-bold">{row.title}</p>
                  <p className="text-xs text-ink-faint">{row.sectionSlug}</p>
                </td>
                <td className="px-4 py-3 font-bold">{row.total}</td>
                {FEEDBACK_STATUSES.map((status) => (
                  <td key={status} className="px-4 py-3">
                    {row.counts[status]}
                  </td>
                ))}
                <td className="px-4 py-3 text-sm text-ink-soft">
                  {row.latestFeedbackAt
                    ? new Date(row.latestFeedbackAt).toLocaleString("zh-CN")
                    : "暂无"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/course-feedback/${row.sectionSlug}`}
                    className="font-bold text-red underline underline-offset-2"
                  >
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
