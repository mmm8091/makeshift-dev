"use client";

import { useState, type ReactNode } from "react";
import { PostComposer } from "@/components/forum/post-composer";
import type { Tag } from "@/lib/forum-types";

/**
 * 帖子正文 + 就地编辑。正文由服务端渲染好后作为 `children` 传入（保持 Markdown 服务端渲染），
 * 客户端只负责在「阅读」与「编辑」之间切换。
 */
export function PostBodyEditable({
  canEdit,
  postId,
  slug,
  rawBody,
  title,
  tags,
  tagSlugs,
  children,
}: {
  canEdit: boolean;
  postId: string;
  slug: string;
  rawBody: string;
  title: string;
  tags: Tag[];
  tagSlugs: string[];
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="mt-6 border-2 border-ink bg-paper-2 p-5">
        <p className="kicker mb-4">编辑帖子</p>
        <PostComposer
          mode="edit"
          postId={postId}
          slug={slug}
          tags={tags}
          initial={{ title, bodyMd: rawBody, tagSlugs }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6">{children}</div>
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 font-serif text-sm font-bold text-ink-soft underline underline-offset-2 hover:text-red"
        >
          编辑
        </button>
      )}
    </div>
  );
}
