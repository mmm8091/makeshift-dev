import type { Author } from "@/lib/forum";
import { ForumAvatar } from "@/components/forum/forum-avatar";

/** 相对时间：列表与详情统一用「刚刚 / N 分钟前 / N 小时前 / N 天前 / 年-月-日」。 */
export function formatWhen(ms: number): string {
  const diff = Date.now() - ms;
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function AuthorByline({
  author,
  when,
  edited,
  size = "md",
}: {
  author: Author;
  when: number;
  edited?: boolean;
  size?: "sm" | "md";
}) {
  const avatar = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <div className="flex items-center gap-2.5">
      <ForumAvatar author={author} className={avatar} />
      <div className="leading-tight">
        <span className="font-display text-sm font-bold text-ink">
          {author.displayName}
        </span>
        <span className="ml-2 font-serif text-xs text-ink-faint">
          {formatWhen(when)}
          {edited ? " · 已编辑" : ""}
        </span>
      </div>
    </div>
  );
}
