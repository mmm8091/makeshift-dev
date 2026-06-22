"use client";

import { useActionState, useState } from "react";
import {
  createPostAction,
  editPostAction,
  FORUM_FORM_IDLE,
} from "@/app/forum/actions";
import { TITLE_MAX, BODY_MAX, MAX_TAGS, type Tag } from "@/lib/forum-types";

type Props = {
  /** 可选标签全集 */
  tags: Tag[];
  mode: "create" | "edit";
  postId?: string;
  slug?: string;
  initial?: { title: string; bodyMd: string; tagSlugs: string[] };
  onCancel?: () => void;
};

const fieldClass =
  "w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none aria-[invalid=true]:border-red";

/** 发帖 / 编辑帖子的表单。校验主力在服务层，这里做计字与即时禁用。 */
export function PostComposer({
  tags,
  mode,
  postId,
  slug,
  initial,
  onCancel,
}: Props) {
  const action = mode === "edit" ? editPostAction : createPostAction;
  const [state, formAction, pending] = useActionState(action, FORUM_FORM_IDLE);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.bodyMd ?? "");
  const [picked, setPicked] = useState<string[]>(initial?.tagSlugs ?? []);

  const titleOk = title.trim().length >= 1 && title.length <= TITLE_MAX;
  const bodyOk = body.trim().length >= 1 && body.length <= BODY_MAX;
  const tagsOk = picked.length <= MAX_TAGS;
  const canSubmit = titleOk && bodyOk && tagsOk && !pending;

  function toggleTag(tagSlug: string) {
    setPicked((prev) =>
      prev.includes(tagSlug)
        ? prev.filter((s) => s !== tagSlug)
        : prev.length >= MAX_TAGS
          ? prev
          : [...prev, tagSlug],
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && (
        <>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="slug" value={slug} />
        </>
      )}

      <label className="block">
        <span className="flex items-center justify-between font-serif text-sm font-bold text-ink">
          标题
          <span
            className={`font-serif text-xs font-normal ${
              title.length > TITLE_MAX ? "text-red" : "text-ink-faint"
            }`}
          >
            {title.length} / {TITLE_MAX}
          </span>
        </span>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          placeholder="一句话说清你想让机器替你做什么"
          className={`mt-1.5 ${fieldClass}`}
        />
        {state.fieldErrors?.title && (
          <span className="mt-1 block font-serif text-xs text-red">
            {state.fieldErrors.title}
          </span>
        )}
      </label>

      <label className="block">
        <span className="flex items-center justify-between font-serif text-sm font-bold text-ink">
          正文
          <span
            className={`font-serif text-xs font-normal ${
              body.length > BODY_MAX ? "text-red" : "text-ink-faint"
            }`}
          >
            {body.length} / {BODY_MAX}
          </span>
        </span>
        <textarea
          name="bodyMd"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          aria-invalid={Boolean(state.fieldErrors?.bodyMd)}
          placeholder="支持 Markdown。把背景、做法、踩的坑写清楚，方便别人接得住"
          className={`mt-1.5 resize-y ${fieldClass}`}
        />
        <span className="mt-1 block font-serif text-xs text-ink-faint">
          支持 Markdown，但不渲染原始 HTML
        </span>
        {state.fieldErrors?.bodyMd && (
          <span className="mt-1 block font-serif text-xs text-red">
            {state.fieldErrors.bodyMd}
          </span>
        )}
      </label>

      <div>
        <span className="font-serif text-sm font-bold text-ink">
          标签
          <span className="ml-2 font-normal text-ink-faint">
            最多 {MAX_TAGS} 个
          </span>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const on = picked.includes(tag.slug);
            return (
              <label
                key={tag.slug}
                className={`cursor-pointer select-none border-2 px-3 py-1 font-serif text-sm font-bold transition-colors ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-edge bg-paper text-ink-soft hover:border-ink"
                }`}
              >
                <input
                  type="checkbox"
                  name="tags"
                  value={tag.slug}
                  checked={on}
                  onChange={() => toggleTag(tag.slug)}
                  className="sr-only"
                />
                {tag.name}
              </label>
            );
          })}
        </div>
        {state.fieldErrors?.tagSlugs && (
          <span className="mt-1 block font-serif text-xs text-red">
            {state.fieldErrors.tagSlugs}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
        >
          {pending
            ? mode === "edit"
              ? "正在保存"
              : "正在发布"
            : mode === "edit"
              ? "保存修改"
              : "发布"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-ink bg-paper px-5 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            取消
          </button>
        )}
        {state.message && !state.fieldErrors && (
          <p role="status" aria-live="polite" className="font-serif text-sm text-red">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
