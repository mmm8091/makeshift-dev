"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  submitCourseFeedbackAction,
  withdrawCourseFeedbackAction,
} from "@/app/courses/feedback-actions";
import type { CourseFeedbackFormState } from "@/app/courses/feedback-actions";
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  type CourseFeedbackView,
  type FeedbackStatus,
} from "@/lib/course-feedback-types";

const COURSE_FEEDBACK_IDLE: CourseFeedbackFormState = { ok: false };

export function CourseFeedbackForm({
  sectionSlug,
  viewerFeedback,
}: {
  sectionSlug: string;
  viewerFeedback: CourseFeedbackView | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitCourseFeedbackAction,
    COURSE_FEEDBACK_IDLE,
  );
  const [status, setStatus] = useState<FeedbackStatus | "">(
    viewerFeedback?.status ?? "",
  );
  const [body, setBody] = useState(viewerFeedback?.bodyMd ?? "");
  const [localHasFeedback, setLocalHasFeedback] = useState(
    Boolean(viewerFeedback),
  );
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [isWithdrawing, startWithdraw] = useTransition();

  useEffect(() => {
    if (!state.ok) return;
    setLocalHasFeedback(true);
    setWithdrawMessage("");
  }, [state]);

  const bodyOk = body.trim().length > 0 && body.length <= FEEDBACK_BODY_MAX;
  const canSubmit = Boolean(status) && bodyOk && !pending;

  const withdraw = () => {
    setWithdrawMessage("");
    startWithdraw(async () => {
      const result = await withdrawCourseFeedbackAction({
        sectionSlug,
      });
      if (!result.ok) {
        setWithdrawMessage(result.message ?? "撤回失败");
        return;
      }
      setStatus("");
      setBody("");
      setLocalHasFeedback(false);
      setWithdrawMessage(result.message ?? "反馈已撤回。");
    });
  };

  return (
    <form action={formAction} className="mt-6 border-2 border-ink bg-paper p-5">
      <input type="hidden" name="sectionSlug" value={sectionSlug} />
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_STATUSES.map((item) => (
          <label
            key={item}
            className={`cursor-pointer border-2 px-3 py-2 font-serif text-sm font-bold transition-colors ${
              status === item
                ? "border-red bg-[rgba(179,38,30,0.08)] text-red"
                : "border-edge bg-paper text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={item}
              checked={status === item}
              onChange={() => setStatus(item)}
              className="sr-only"
            />
            {FEEDBACK_STATUS_LABELS[item]}
          </label>
        ))}
      </div>
      {state.fieldErrors?.status && (
        <p className="mt-2 font-serif text-sm text-red">
          {state.fieldErrors.status}
        </p>
      )}

      <textarea
        name="bodyMd"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={6}
        maxLength={FEEDBACK_BODY_MAX}
        aria-invalid={Boolean(state.fieldErrors?.bodyMd)}
        placeholder="写清楚这一节哪里顺、哪里难、卡在哪一步。支持 Markdown。"
        className="mt-4 w-full resize-y border-2 border-ink bg-paper px-4 py-3 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none aria-[invalid=true]:border-red"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-xs text-ink-faint">
          提交后会出现在本节课程讨论帖中；不要粘贴 token、卡密、邮箱、手机号或私密路径。
        </p>
        <span className="font-serif text-xs text-ink-faint">
          {body.length}/{FEEDBACK_BODY_MAX}
        </span>
      </div>
      {state.fieldErrors?.bodyMd && (
        <p className="mt-2 font-serif text-sm text-red">
          {state.fieldErrors.bodyMd}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="border-2 border-ink bg-ink px-5 py-2.5 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
        >
          {pending ? "正在提交" : localHasFeedback ? "更新反馈" : "提交反馈"}
        </button>
        {localHasFeedback && (
          <button
            type="button"
            onClick={withdraw}
            disabled={isWithdrawing}
            className="border-2 border-ink bg-paper px-4 py-2.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWithdrawing ? "正在撤回" : "撤回反馈"}
          </button>
        )}
        {(state.message || withdrawMessage) && (
          <span role="status" className="font-serif text-sm text-ink-soft">
            {state.message || withdrawMessage}
          </span>
        )}
      </div>
    </form>
  );
}
