import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ARTICLES,
  getCourse,
  getAdjacentArticles,
  type CourseEntry,
} from "@/lib/courses";
import { getPublicCourseMarkdown } from "@/lib/content";
import { CourseMarkdown } from "@/components/markdown";
import { ChapterNav } from "@/components/chapter-nav";

// 预渲染所有已知 slug 的文章页（报名、前言等）。
export function generateStaticParams() {
  return ARTICLES.filter((c) => c.slug).map((c) => ({ slug: c.slug! }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "未找到课程" };
  return { title: course.title, description: course.summary || undefined };
}

/** 未解锁/待上传时的占位，不渲染正文。 */
function Gate({ course }: { course: CourseEntry }) {
  const comingSoon = !course.available;
  return (
    <div className="print-block mt-10 p-8">
      <p className="kicker">{comingSoon ? "内容待上传" : "报名解锁"}</p>
      <p className="ink-bold mt-4 font-serif text-lg text-ink-soft">
        {comingSoon
          ? "这一课的正文还在准备中，敬请期待"
          : "这一课的正文需要报名解锁后阅读"}
      </p>
      {!comingSoon && (
        <Link
          href="/courses/enroll"
          className="mt-6 inline-flex items-center border-2 border-ink bg-ink px-5 py-2.5 font-bold text-paper transition-colors hover:bg-red hover:border-red"
        >
          如何报名 →
        </Link>
      )}
    </div>
  );
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  // 公开且已上传的课程才读取正文；其余只显示占位，不泄漏正文。
  const body =
    course.public && course.available
      ? await getPublicCourseMarkdown(slug)
      : null;

  const { prev, next } = getAdjacentArticles(slug);

  return (
    <article className="mx-auto max-w-3xl px-5 pb-14">
      {/* 章节按钮：左上、阅读时 sticky 常驻 */}
      <div className="sticky top-18 z-30 -mx-5 flex items-center justify-between gap-4 border-b border-edge bg-paper px-5 py-3">
        <ChapterNav articles={ARTICLES} currentSlug={slug} />
        <Link
          href="/courses"
          className="font-serif text-sm font-semibold text-ink-soft hover:text-red"
        >
          返回课程目录 →
        </Link>
      </div>

      <header className="mt-10">
        <p className="kicker">
          {course.order === 0 ? "前言" : `第 ${course.order} 课`}
          {course.public && " · 公开免费"}
        </p>
        <h1 className="misprint mt-3 font-display text-4xl font-black leading-tight sm:text-5xl">
          {course.title}
        </h1>
        {course.summary && (
          <p className="ink-bold mt-4 font-serif text-lg text-ink-soft">
            {course.summary}
          </p>
        )}
      </header>

      <div className="mt-8 rule-ink" />

      {body ? (
        <div className="mt-8">
          <CourseMarkdown markdown={body} />
        </div>
      ) : (
        <Gate course={course} />
      )}

      {(prev || next) && (
        <nav className="mt-16 grid gap-4 border-t-2 border-ink pt-8 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/courses/${prev.slug}`}
              className="print-block flex flex-col p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className="kicker">← 上一篇</span>
              <span className="mt-2 font-display font-extrabold">
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/courses/${next.slug}`}
              className="print-block flex flex-col p-4 text-right transition-transform hover:-translate-y-0.5 sm:items-end"
            >
              <span className="kicker">下一篇 →</span>
              <span className="mt-2 font-display font-extrabold">
                {next.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </article>
  );
}
