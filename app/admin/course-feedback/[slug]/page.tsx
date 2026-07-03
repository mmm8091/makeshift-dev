import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ForumMarkdown } from "@/components/forum/forum-markdown";
import { listCourseFeedbackForAdmin } from "@/lib/course-feedback";
import { FEEDBACK_STATUS_LABELS, FEEDBACK_STATUSES } from "@/lib/course-feedback-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "课程反馈详情" };

export default async function CourseFeedbackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const page = await listCourseFeedbackForAdmin({
    env,
    requestHeaders: await headers(),
    sectionSlug: slug,
  });
  if (!page) redirect("/me");
  if (!page.title) notFound();

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">后台 · 课程反馈</p>
          <h1 className="mt-2 font-display text-4xl font-black">{page.title}</h1>
          <p className="mt-3 font-serif text-base text-ink-soft">{page.sectionSlug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page.discussionPostSlug && (
            <Link
              href={`/forum/t/${page.discussionPostSlug}`}
              className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              课程讨论帖
            </Link>
          )}
          <Link
            href="/admin/course-feedback"
            className="border-2 border-ink bg-ink px-4 py-2 font-bold text-paper transition-colors hover:border-red hover:bg-red"
          >
            返回统计
          </Link>
        </div>
      </div>

      <div className="grid gap-3 border-2 border-edge bg-paper-2 p-5 sm:grid-cols-4">
        <FeedbackCount label="有效反馈" value={page.total} />
        {FEEDBACK_STATUSES.map((status) => (
          <FeedbackCount
            key={status}
            label={FEEDBACK_STATUS_LABELS[status]}
            value={page.counts[status]}
          />
        ))}
      </div>

      <ul className="mt-8 space-y-4">
        {page.feedback.length > 0 ? (
          page.feedback.map((item) => (
            <li
              key={item.id}
              className={`border-2 bg-paper p-5 ${
                item.withdrawnAt ? "border-edge opacity-70" : "border-ink"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif font-bold">{item.author.displayName}</p>
                  <p className="font-serif text-xs text-ink-faint">
                    更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border-2 border-edge px-2 py-1 font-serif text-xs font-bold text-ink-soft">
                    {FEEDBACK_STATUS_LABELS[item.status]}
                  </span>
                  {item.withdrawnAt && (
                    <span className="border-2 border-red px-2 py-1 font-serif text-xs font-bold text-red">
                      已撤回
                    </span>
                  )}
                  {!item.forumCommentId && (
                    <span className="border-2 border-red px-2 py-1 font-serif text-xs font-bold text-red">
                      未同步
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <ForumMarkdown markdown={item.bodyMd} />
              </div>
              {item.withdrawnAt && (
                <p className="mt-3 font-serif text-xs text-ink-faint">
                  撤回于 {new Date(item.withdrawnAt).toLocaleString("zh-CN")}
                </p>
              )}
            </li>
          ))
        ) : (
          <li className="border-2 border-dashed border-edge bg-paper-2 p-8 font-serif text-ink-soft">
            这一节暂时没有反馈。
          </li>
        )}
      </ul>
    </main>
  );
}

function FeedbackCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-serif text-xs font-bold text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
