import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * 公开课程正文的读取层（seam）。
 *
 * 现在：公开课程正文以 Markdown 存在仓库 `content/courses/{slug}.md`，
 * agent 直接改文件、走 PR 即可。
 *
 * 将来：付费课程正文存 Cloudflare D1，由服务端校验 session + entitlement 后读取。
 * 那时在这里新增一条受保护分支（按权限从 D1 取 body），阅读页 UI 不变，
 * 只是正文来源和鉴权不同。未解锁时返回 null，由页面渲染解锁引导，不泄漏正文。
 */

const COURSES_DIR = path.join(process.cwd(), "content", "courses");

/** 读取公开课程 Markdown 正文；不存在时返回 null。 */
export async function getPublicCourseMarkdown(
  slug: string,
): Promise<string | null> {
  // 防目录穿越：slug 只允许字母、数字、连字符
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  try {
    return await fs.readFile(path.join(COURSES_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
}
