"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LockIcon } from "@/components/icons";
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

function lockedForViewer(
  article: CourseEntry,
  unlockedEntitlements: string[],
) {
  if (article.public || !article.available) return false;
  const scope = article.requiredEntitlement;
  return scope ? !unlockedEntitlements.includes(scope) : true;
}

function childArticlesOf(articles: CourseEntry[], parentSlug: string) {
  return articles.filter((article) => article.parentSlug === parentSlug);
}

function topLevelArticles(articles: CourseEntry[]) {
  return articles.filter((article) => !article.parentSlug);
}

function labelOf(a: CourseEntry) {
  if (a.slug === "enroll") return a.title;
  return a.available ? a.title : "待上传";
}

function NavRow({
  article,
  currentSlug,
  index,
  nested = false,
  unlockedEntitlements,
  currentItemRef,
  onSelect,
}: {
  article: CourseEntry;
  currentSlug: string;
  index?: number;
  nested?: boolean;
  unlockedEntitlements: string[];
  currentItemRef?: Ref<HTMLLIElement>;
  onSelect: () => void;
}) {
  const state = stateOf(article, currentSlug);
  const isViewerLocked = lockedForViewer(article, unlockedEntitlements);
  const href = isViewerLocked ? ENROLL_HREF : hrefOf(article, state);

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 border-2 px-3 py-2.5 transition-colors",
        nested && "ml-8 border-l-red/60 py-2",
        state === "current" ? "border-red bg-paper-2" : "border-transparent",
        state === "coming" && "opacity-50",
        isViewerLocked && state !== "current" && "opacity-60",
      )}
    >
      {!nested && index !== undefined && (
        <span className="font-mono text-xs text-ink-faint">
          {String(index).padStart(2, "0")}
        </span>
      )}
      {isViewerLocked && (
        <span
          aria-hidden
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-ink-faint",
            state === "current" && "text-red",
          )}
        >
          <LockIcon className="h-4 w-4" />
        </span>
      )}
      <span
        className={cn(
          "min-w-0 flex-1 font-serif text-[0.95rem] leading-snug",
          nested && "text-[0.92rem]",
          state === "current" ? "font-bold text-red" : "text-ink",
          isViewerLocked && state !== "current" && "text-ink-soft",
        )}
      >
        {labelOf(article)}
        {isViewerLocked && <span className="sr-only">（报名解锁）</span>}
      </span>
    </div>
  );

  return (
    <li
      key={article.slug ?? `${article.order}-${article.title}`}
      ref={state === "current" ? currentItemRef : undefined}
    >
      {href ? (
        <Link
          href={href}
          onClick={onSelect}
          className="block transition-colors hover:bg-paper-3"
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}

/** 章节栏：阅读时可展开，列出全部文章结构。后续可扩展母子层级。 */
export function ChapterNav({
  articles,
  currentSlug,
  unlockedEntitlements = [],
}: {
  articles: CourseEntry[];
  currentSlug: string;
  unlockedEntitlements?: string[];
}) {
  const [open, setOpen] = useState(false);
  const currentItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      currentItemRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentSlug, open]);

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
              {topLevelArticles(articles).map((article, index) => (
                <li key={article.slug ?? `${article.order}-${article.title}`}>
                  <ol>
                    <NavRow
                      article={article}
                      currentSlug={currentSlug}
                      index={index}
                      unlockedEntitlements={unlockedEntitlements}
                      currentItemRef={currentItemRef}
                      onSelect={() => setOpen(false)}
                    />
                    {article.slug &&
                      childArticlesOf(articles, article.slug).map((child) => (
                        <NavRow
                          key={child.slug}
                          article={child}
                          currentSlug={currentSlug}
                          nested
                          unlockedEntitlements={unlockedEntitlements}
                          currentItemRef={currentItemRef}
                          onSelect={() => setOpen(false)}
                        />
                      ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>
        </div>,
          document.body,
        )}
    </>
  );
}
