/**
 * 首页课程目录所用的公开元数据。
 *
 * 注意：这里只放标题、摘要、顺序、解锁状态 —— 公开内容。
 * 付费课程正文存 Cloudflare D1，由服务端鉴权后读取，永不进入这里或前端 bundle。
 *
 * 当前除前言外的课程内容尚未确定，一律标记 available=false（卡片显示「待上传」），
 * 不编造标题与摘要。待真实课程定稿后再逐条补全。
 */
export type CourseEntry = {
  order: number;
  title: string;
  summary: string;
  /** true = 公开·免费；false = 报名解锁 */
  public: boolean;
  /** 是否已上传可读；false 时卡片显示「待上传」且不可点击 */
  available: boolean;
  /** 仅 available 时有意义 */
  slug?: string;
  /** 正文来源：repo 只允许公开正文；d1 可为公开或付费正文 */
  source?: "repo" | "d1";
  /** 付费正文所需权益；D1 locked 课程未填时默认 course:full */
  requiredEntitlement?: string | null;
  /** 章节抽屉里的父级文章；例如 1.1 挂在第一讲下 */
  parentSlug?: string | null;
};

export const DEFAULT_COURSE_ENTITLEMENT = "course:full";

export const COURSES: CourseEntry[] = [
  {
    order: 0,
    slug: "preface",
    title: "前言：平民编程与创造的时代",
    summary:
      "从认知劳动的重新定价，到技术祭司的黄昏 —— 为什么普通人此刻该重新拿起工具",
    public: true,
    available: true,
    source: "repo",
  },
  {
    order: 1,
    slug: "01-will",
    title: "第一讲：树立一个意志",
    summary: "在代码之前，先回答你到底要让机器替你完成什么",
    public: true,
    available: true,
    source: "repo",
  },
  { order: 2, title: "待上传", summary: "", public: false, available: false },
  { order: 3, title: "待上传", summary: "", public: false, available: false },
  { order: 4, title: "待上传", summary: "", public: false, available: false },
  { order: 5, title: "待上传", summary: "", public: false, available: false },
];

const SUBSECTION_PARENT_BY_MAJOR: Record<string, string> = {
  "1": "01-will",
};

/** 让 D1 小节按标题号自动挂到大讲下面，例如 1.1 -> 第一讲。 */
export function inferParentSlugFromTitle(title: string): string | null {
  const match = title.trim().match(/^(\d+)\.\d+/);
  if (!match) return null;
  return SUBSECTION_PARENT_BY_MAJOR[match[1]] ?? null;
}

/**
 * 报名文章。
 *
 * 在本站，「课程」其实就是文章系统：报名页本身也是一篇文章，归在课程里、排在最前。
 * 章节栏里点到「锁住」的文章时，统一跳到这里。
 * 正文待补充（available=false）；写好后放 content/courses/enroll.md 并置 available=true。
 */
export const ENROLL: CourseEntry = {
  order: -1,
  slug: "enroll",
  title: "如何报名",
  summary: "卡密兑换、加入方式与课程权限说明",
  public: true,
  available: false,
};

/**
 * 文章系统的完整有序列表（报名在最前，其后是课程路径）。
 * 用于阅读页路由与章节栏；首页「课程路径」预览仍只用 COURSES，不含报名。
 */
export const ARTICLES: CourseEntry[] = [ENROLL, ...COURSES];

/** 合并静态文章壳与 D1 课程元数据；同 slug 时保留静态壳，避免公开正文被 D1 覆盖。 */
export function mergeArticlesWithDbCourses(
  dbCourses: CourseEntry[],
): CourseEntry[] {
  const slugs = new Set(ARTICLES.map((item) => item.slug).filter(Boolean));
  const uniqueDbCourses = dbCourses.filter(
    (item) => item.slug && !slugs.has(item.slug),
  );
  const dbOrders = new Set(uniqueDbCourses.map((item) => item.order));
  const staticArticles = ARTICLES.filter(
    (item) => item.slug || !dbOrders.has(item.order),
  );

  return [...staticArticles, ...uniqueDbCourses].sort(
    (a, b) => a.order - b.order,
  );
}

/** 按 slug 取文章元数据（含报名）。 */
export function getCourse(slug: string): CourseEntry | undefined {
  return ARTICLES.find((c) => c.slug === slug);
}

/** 取相邻可阅读文章（跳过没有 slug 的待上传占位），用于文末上一篇/下一篇。 */
export function getAdjacentArticles(slug: string): {
  prev?: CourseEntry;
  next?: CourseEntry;
} {
  return getAdjacentArticlesFromList(ARTICLES, slug);
}

export function getAdjacentArticlesFromList(
  articles: CourseEntry[],
  slug: string,
): {
  prev?: CourseEntry;
  next?: CourseEntry;
} {
  const i = articles.findIndex((c) => c.slug === slug);
  if (i < 0) return {};
  const prev = [...articles.slice(0, i)].reverse().find((c) => c.slug);
  const next = articles.slice(i + 1).find((c) => c.slug);
  return { prev, next };
}

/** 报名文章的阅读路径，章节栏中锁住的文章都跳这里。 */
export const ENROLL_HREF = "/courses/enroll";
