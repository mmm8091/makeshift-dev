import Link from "next/link";
import { CourseFeedbackForm } from "@/components/course/course-feedback-form";
import { ForumMarkdown } from "@/components/forum/forum-markdown";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  type CourseFeedbackSummary,
} from "@/lib/course-feedback-types";

export function CourseFeedbackSection({
  summary,
}: {
  summary: CourseFeedbackSummary;
}) {
  return (
    <section className="mt-16 border-t-2 border-ink pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">课程反馈</p>
          <h2 className="mt-2 font-display text-2xl font-black">
            这一节学得怎么样？
          </h2>
        </div>
        {summary.discussionPostSlug && (
          <Link
            href={`/forum/t/${summary.discussionPostSlug}`}
            className="border-2 border-ink bg-paper px-4 py-2 font-serif text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            去论坛查看全部讨论 →
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-3 border-2 border-ink bg-paper-2 p-3 shadow-[4px_4px_0_0_var(--color-edge)] sm:grid-cols-4">
        <FeedbackCount label="全部" value={summary.total} />
        {FEEDBACK_STATUSES.map((item) => (
          <FeedbackCount
            key={item}
            label={FEEDBACK_STATUS_LABELS[item]}
            value={summary.counts[item]}
          />
        ))}
      </div>

      {summary.total === 0 && (
        <div className="mt-5 border-2 border-dashed border-red bg-paper p-5">
          <p className="font-serif font-bold text-ink">
            还没人反馈这一节，你可以当第一个探路的人。
          </p>
          <p className="mt-2 font-serif text-sm text-ink-soft">
            顺利、难懂、卡住都欢迎。它不是考试成绩，是后面改课和互相搭把手的线索。
          </p>
        </div>
      )}

      <CourseFeedbackForm
        sectionSlug={summary.sectionSlug}
        viewerFeedback={summary.viewerFeedback}
      />

      {summary.highlightedComments.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-black">讨论里大家在说</h3>
            <p className="font-serif text-sm text-ink-faint">
              按赞数优先，赞数相同看最近
            </p>
          </div>
          <ul className="mt-4 space-y-4">
            {summary.highlightedComments.map((comment) => (
              <li key={comment.id} className="border-2 border-edge bg-paper-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-serif text-sm font-bold text-ink">
                    {comment.author.displayName}
                  </p>
                  <span className="font-serif text-xs text-ink-faint">
                    赞 {comment.likeCount}
                  </span>
                </div>
                <div className="mt-2">
                  <ForumMarkdown markdown={comment.bodyMd} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FeedbackCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-edge bg-paper px-4 py-4 sm:px-5">
      <p className="font-serif text-sm font-bold text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-4xl font-black leading-none text-ink sm:text-5xl">
        {value}
      </p>
    </div>
  );
}

export function CourseDiscussionCta({
  discussionPostSlug,
}: {
  discussionPostSlug: string;
}) {
  return (
    <section className="mt-16 border-t-2 border-ink pt-8">
      <p className="kicker">论坛</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-2 border-edge bg-paper-2 p-5">
        <div>
          <h2 className="font-display text-2xl font-black">这节课的讨论现场</h2>
          <p className="mt-2 font-serif text-sm text-ink-soft">
            公开章节的讨论统一放在论坛里，登录和解锁由论坛入口处理。
          </p>
        </div>
        <Link
          href={`/forum/t/${discussionPostSlug}`}
          className="border-2 border-ink bg-paper px-5 py-3 font-serif text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          去论坛查看全部讨论 →
        </Link>
      </div>
    </section>
  );
}
