"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderatePostAction } from "@/app/forum/actions";
import type { ContentStatus, ModerationAction } from "@/lib/forum-types";

/** 管理员操作条：置顶 / 隐藏 / 删除。仅 canModerate 时由详情页渲染。 */
export function ModerationBar({
  postId,
  slug,
  pinned,
  status,
}: {
  postId: string;
  slug: string;
  pinned: boolean;
  status: ContentStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const published = status === "published";

  function run(action: ModerationAction) {
    if (action === "delete" && !window.confirm("删除后帖子会从列表与详情下架，确认删除")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await moderatePostAction({ postId, slug, action });
      if (!result.ok) setError(result.message ?? "操作失败");
      else router.refresh();
    });
  }

  const btn =
    "border-2 border-ink bg-paper px-3 py-1.5 font-serif text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-2 border-dashed border-red bg-paper p-3">
      <span className="kicker mr-1">管理</span>
      {published ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(pinned ? "unpin" : "pin")}
            className={btn}
          >
            {pinned ? "取消置顶" : "置顶"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("hide")}
            className={btn}
          >
            隐藏
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("delete")}
            className="border-2 border-red bg-paper px-3 py-1.5 font-serif text-sm font-bold text-red transition-colors hover:bg-red hover:text-paper disabled:opacity-50"
          >
            删除
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("restore")}
            className={btn}
          >
            恢复公开
          </button>
          {status === "hidden" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("delete")}
              className="border-2 border-red bg-paper px-3 py-1.5 font-serif text-sm font-bold text-red transition-colors hover:bg-red hover:text-paper disabled:opacity-50"
            >
              删除
            </button>
          )}
        </>
      )}
      {error && <span className="font-serif text-sm text-red">{error}</span>}
    </div>
  );
}
