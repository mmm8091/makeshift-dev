import Link from "next/link";
import type { Tag } from "@/lib/forum";
import { cn } from "@/lib/utils";

/** 作业分享是内建主标签，给个红描边凸显。 */
const HIGHLIGHT_SLUGS = new Set(["homework"]);

/** 标签芯片：点进 /forum/tag/[slug]。`active` 用于筛选页当前标签。 */
export function TagChips({
  tags,
  activeSlug,
}: {
  tags: Tag[];
  activeSlug?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        const active = tag.slug === activeSlug;
        const highlight = HIGHLIGHT_SLUGS.has(tag.slug);
        return (
          <Link
            key={tag.slug}
            href={`/forum/tag/${tag.slug}`}
            className={cn(
              "border-2 px-2.5 py-0.5 font-serif text-xs font-bold transition-colors",
              active
                ? "border-ink bg-ink text-paper"
                : highlight
                  ? "border-red bg-paper text-red hover:bg-red hover:text-paper"
                  : "border-edge bg-paper text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {tag.name}
          </Link>
        );
      })}
    </div>
  );
}
