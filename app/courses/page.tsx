import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CourseCatalog } from "@/components/sections/course-catalog";
import { getPublishedDbCourseEntries } from "@/lib/content";
import { mergeArticlesWithDbCourses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "课程",
  description: "课程目录：部分课程及摘要公开，完整内容需报名",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const { env } = await getCloudflareContext({ async: true });
  const entries = mergeArticlesWithDbCourses(
    await getPublishedDbCourseEntries(env),
  ).filter((entry) => entry.order >= 0);

  return <CourseCatalog entries={entries} />;
}
