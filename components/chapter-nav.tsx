"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { type CourseEntry, ENROLL_HREF } from "@/lib/courses";
import { cn } from "@/lib/utils";

type ArticleState = "current" | "open" | "locked" | "coming";

function stateOf(a: CourseEntry, currentSlug: string): ArticleState {
  if (a.slug === currentSlug) return "current";
  if (a.available || a.slug === "enroll") return "open";
  if (!a.public) return "locked"; // 报名解锁 → 跳报名页
  return "coming"; // 公开但待上传
}

function hrefOf(a: CourseEntry, state: ArticleState): string | null {
  if (state === "locked") return ENROLL_HREF;
  if (a.slug) return `/courses/${a.slug}`;
  return null;
}

/** 章节栏：阅读时可展开，列出全部文章结构。后续可扩展母子层级。 */
export function ChapterNav({
  articles,
  currentSlug,
}: {
  articles: CourseEntry[];
  currentSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <span aria-hidden>☰</span> 章节
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50">
          {/* 背景遮罩 */}
          <button
            type="button"
            aria-label="关闭章节栏"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          {/* 抽屉 */}
          <nav className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r-2 border-ink bg-paper shadow-[6px_0_0_0_rgba(32,53,43,0.15)]">
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
              <span className="kicker">章节</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="font-display text-xl font-black text-ink-soft hover:text-red"
              >
                ✕
              </button>
            </div>

            <ol className="flex-1 overflow-y-auto p-3">
              {articles.map((a, i) => {
                const state = stateOf(a, currentSlug);
                const href = hrefOf(a, state);
                const label =
                  a.slug === "enroll" ? a.title : a.available ? a.title : "待上传";

                const inner = (
                  <div
                    className={cn(
                      "flex items-center gap-3 border-2 px-3 py-2.5",
                      state === "current"
                        ? "border-red bg-paper-2"
                        : "border-transparent",
                      state === "coming" && "opacity-50",
                    )}
                  >
                    <span className="font-mono text-xs text-ink-faint">
                      {String(i).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 font-serif text-[0.95rem] leading-snug",
                        state === "current" ? "font-bold text-red" : "text-ink",
                      )}
                    >
                      {label}
                    </span>
                    {state === "locked" && (
                      <span aria-hidden className="text-sm text-ink-faint">
                        🔒
                      </span>
                    )}
                  </div>
                );

                return (
                  <li key={`${a.slug ?? "x"}-${i}`}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="block transition-colors hover:bg-paper-3"
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>,
          document.body,
        )}
    </>
  );
}
