import type { Metadata } from "next";
import { CourseCatalog } from "@/components/sections/course-catalog";

export const metadata: Metadata = {
  title: "课程",
  description: "课程目录：部分课程及摘要公开，完整内容需报名",
};

export default function CoursesPage() {
  return <CourseCatalog />;
}
