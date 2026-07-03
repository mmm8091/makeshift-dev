"use client";

import { useState, useTransition } from "react";
import {
  followPostAction,
  unfollowPostAction,
} from "@/app/forum/actions";

export function FollowPostButton({
  postId,
  slug,
  initialFollowed,
}: {
  postId: string;
  slug: string;
  initialFollowed: boolean;
}) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    setMessage("");
    const next = !followed;
    setFollowed(next);
    startTransition(async () => {
      const result = next
        ? await followPostAction({ postId, slug })
        : await unfollowPostAction({ postId, slug });
      if (!result.ok) {
        setFollowed(!next);
        setMessage(result.message ?? "关注状态更新失败");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`border-2 px-3 py-1.5 font-serif text-xs font-bold transition-colors disabled:opacity-60 ${
          followed
            ? "border-gold bg-[rgba(215,168,63,0.14)] text-gold hover:border-red hover:text-red"
            : "border-ink bg-paper text-ink hover:bg-ink hover:text-paper"
        }`}
      >
        {followed ? "已关注" : "关注"}
      </button>
      {message && (
        <span role="status" className="font-serif text-xs text-red">
          {message}
        </span>
      )}
    </div>
  );
}
