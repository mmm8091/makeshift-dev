"use client";

import { useActionState, useEffect, useState } from "react";
import { addCommentAction, editCommentAction } from "@/app/forum/actions";
import { FORUM_FORM_IDLE } from "@/lib/forum-form-state";
import { BODY_MAX } from "@/lib/forum-types";

type Props = {
  slug: string;
  mode: "create" | "edit";
  postId?: string;
  commentId?: string;
  initialBody?: string;
  onDone?: () => void;
  onCancel?: () => void;
};

/** 回复 / 编辑回复的表单。新建成功后清空；编辑成功后回调收起。 */
export function CommentComposer({
  slug,
  mode,
  postId,
  commentId,
  initialBody,
  onDone,
  onCancel,
}: Props) {
  const action = mode === "edit" ? editCommentAction : addCommentAction;
  const [state, formAction, pending] = useActionState(action, FORUM_FORM_IDLE);
  const [body, setBody] = useState(initialBody ?? "");

  useEffect(() => {
    if (!state.ok) return;
    if (mode === "create") setBody("");
    onDone?.();
    // 仅在动作成功时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const bodyOk = body.trim().length >= 1 && body.length <= BODY_MAX;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      {mode === "create" ? (
        <input type="hidden" name="postId" value={postId} />
      ) : (
        <input type="hidden" name="commentId" value={commentId} />
      )}

      <textarea
        name="bodyMd"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={mode === "edit" ? 4 : 3}
        maxLength={BODY_MAX}
        aria-invalid={Boolean(state.fieldErrors?.bodyMd)}
        placeholder={mode === "edit" ? "" : "回点什么，先假设对方是认真的"}
        className="w-full resize-y border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none aria-[invalid=true]:border-red"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!bodyOk || pending}
          className="border-2 border-ink bg-ink px-5 py-2.5 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
        >
          {pending ? "正在提交" : mode === "edit" ? "保存" : "回复"}
        </button>
        {mode === "edit" && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-ink bg-paper px-4 py-2.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            取消
          </button>
        )}
        {(state.fieldErrors?.bodyMd || state.message) && (
          <span role="status" aria-live="polite" className="font-serif text-sm text-red">
            {state.fieldErrors?.bodyMd ?? state.message}
          </span>
        )}
      </div>
    </form>
  );
}
