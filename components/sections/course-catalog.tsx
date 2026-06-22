import Link from "next/link";
import { COURSES, type CourseEntry } from "@/lib/courses";
import { cn } from "@/lib/utils";

function Badge({ entry }: { entry: CourseEntry }) {
  if (entry.public) {
    return (
      <span className="border border-terminal px-2 py-0.5 text-xs font-bold text-terminal">
        公开 · 免费
      </span>
    );
  }
  return (
    <span className="border border-ink-faint px-2 py-0.5 text-xs font-bold text-ink-faint">
      报名解锁
    </span>
  );
}

function CardInner({ entry }: { entry: CourseEntry }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl font-black text-edge">
          {String(entry.order).padStart(2, "0")}
        </span>
        <Badge entry={entry} />
      </div>

      <h3
        className={cn(
          "mt-4 font-display text-lg font-extrabold leading-snug",
          entry.available ? "group-hover:text-red" : "text-ink-faint",
        )}
      >
        {entry.title}
      </h3>

      {entry.summary && (
        <p className="ink-bold mt-2 flex-1 font-serif text-[0.95rem] leading-relaxed text-ink-soft">
          {entry.summary}
        </p>
      )}

      {entry.available && (
        <span className="mt-4 text-sm font-bold text-red opacity-0 transition-opacity group-hover:opacity-100">
          {entry.public ? "开始阅读 →" : "打开课程 →"}
        </span>
      )}
    </>
  );
}

export function CourseCatalog({ entries = COURSES }: { entries?: CourseEntry[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">课程路径</p>
          <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">
            一条从意志到作品的路
          </h2>
        </div>
        <Link
          href="/courses"
          className="hidden shrink-0 font-semibold text-ink-soft hover:text-red sm:inline"
        >
          查看完整目录 →
        </Link>
      </div>

      <p className="mt-4 max-w-2xl font-serif text-ink-soft">
        部分课程及摘要公开，完整内容需报名
      </p>

      <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((c) => (
          <li key={c.slug ?? c.order}>
            {c.available && c.slug ? (
              <Link
                href={`/courses/${c.slug}`}
                className="print-block group flex h-full flex-col p-5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <CardInner entry={c} />
              </Link>
            ) : (
              <div className="print-block flex h-full min-h-44 flex-col p-5 opacity-75">
                <CardInner entry={c} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
