import prefaceMarkdown from "@/content/courses/preface.md";

/**
 * 公开课程正文的读取层（seam）。
 *
 * 现在：公开课程正文以 Markdown 存在仓库 `content/courses/{slug}.md`。
 * 这些公开文件在构建期作为字符串打进 Worker bundle，避免 Cloudflare
 * Workers 运行时读不到 Node 文件系统。
 *
 * 将来：付费课程正文存 Cloudflare D1，由服务端校验 session + entitlement 后读取。
 * 那时在这里新增一条受保护分支（按权限从 D1 取 body），阅读页 UI 不变，
 * 只是正文来源和鉴权不同。未解锁时返回 null，由页面渲染解锁引导，不泄漏正文。
 */

const PUBLIC_COURSE_MARKDOWN: Record<string, string> = {
  preface: prefaceMarkdown,
};

/** 读取公开课程 Markdown 正文；不存在时返回 null。 */
export async function getPublicCourseMarkdown(
  slug: string,
): Promise<string | null> {
  // 防目录穿越：slug 只允许字母、数字、连字符
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  return PUBLIC_COURSE_MARKDOWN[slug] ?? null;
}
