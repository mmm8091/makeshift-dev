"use client";

import { useState, type ReactNode } from "react";
import { CommentComposer } from "@/components/forum/comment-composer";

/**
 * 单条回复 + 就地编辑。byline 与正文由服务端渲染后传入，客户端只切换编辑态。
 */
export function CommentItem({
  canEdit,
  commentId,
  slug,
  rawBody,
  byline,
  children,
}: {
  canEdit: boolean;
  commentId: string;
  slug: string;
  rawBody: string;
  byline: ReactNode;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="border-t-2 border-edge py-5 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        {byline}
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-serif text-xs font-bold text-ink-soft underline underline-offset-2 hover:text-red"
          >
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <CommentComposer
            mode="edit"
            slug={slug}
            commentId={commentId}
            initialBody={rawBody}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-2 pl-[2.6rem]">{children}</div>
      )}
    </li>
  );
}
