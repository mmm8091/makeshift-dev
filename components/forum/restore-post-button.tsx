"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderatePostAction } from "@/app/forum/actions";

export function RestorePostButton({
  postId,
  slug,
}: {
  postId: string;
  slug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore() {
    setError(null);
    startTransition(async () => {
      const result = await moderatePostAction({ postId, slug, action: "restore" });
      if (!result.ok) {
        setError(result.message ?? "恢复失败");
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={restore}
        className="border-2 border-ink bg-paper px-3 py-1.5 font-serif text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {pending ? "恢复中" : "恢复"}
      </button>
      {error && <span className="font-serif text-xs text-red">{error}</span>}
    </span>
  );
}
