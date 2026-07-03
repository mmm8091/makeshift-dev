"use client";

import { useState, useTransition } from "react";
import {
  likeCommentAction,
  unlikeCommentAction,
} from "@/app/forum/actions";

export function CommentLikeButton({
  commentId,
  slug,
  initialLiked,
  initialCount,
  canLike,
}: {
  commentId: string;
  slug: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    if (!canLike) return;
    setMessage("");
    const next = !liked;
    setLiked(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    startTransition(async () => {
      const result = next
        ? await likeCommentAction({ commentId, slug })
        : await unlikeCommentAction({ commentId, slug });
      if (!result.ok) {
        setLiked(!next);
        setCount((current) => Math.max(0, current + (next ? -1 : 1)));
        setMessage(result.message ?? "点赞失败");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={!canLike || isPending}
        className={`border-2 px-2.5 py-1 font-serif text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          liked
            ? "border-red bg-[rgba(179,38,30,0.08)] text-red"
            : "border-edge bg-paper text-ink-soft hover:border-ink hover:text-ink"
        }`}
        title={canLike ? "点赞这条回复" : "不能给自己的回复点赞"}
      >
        赞 {count}
      </button>
      {message && (
        <span role="status" className="font-serif text-xs text-red">
          {message}
        </span>
      )}
    </div>
  );
}
