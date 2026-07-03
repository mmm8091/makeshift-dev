import { QQAvatar } from "@/components/qq-avatar";
import type { Author } from "@/lib/forum-types";
import { cn } from "@/lib/utils";

/** 论坛头像：有 QQ 走代理头像，无 QQ 用昵称首字的墨框占位。 */
export function ForumAvatar({
  author,
  className,
}: {
  author: Author;
  className?: string;
}) {
  if (author.userId.startsWith("system-") || author.displayName === "草台系统") {
    return (
      <div className={cn("overflow-hidden border-2 border-ink bg-paper", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt={author.displayName}
          loading="lazy"
          className="h-full w-full object-contain p-1"
        />
      </div>
    );
  }

  if (author.qq) {
    return (
      <div className={cn("overflow-hidden border-2 border-ink bg-paper", className)}>
        <QQAvatar qq={author.qq} name={author.displayName} className="h-full w-full" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center border-2 border-ink bg-paper-3 font-display font-black text-ink",
        className,
      )}
      aria-hidden
    >
      {(author.displayName || "草").slice(0, 1)}
    </div>
  );
}
