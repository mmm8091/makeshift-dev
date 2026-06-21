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
};

export const COURSES: CourseEntry[] = [
  {
    order: 0,
    slug: "preface",
    title: "前言：平民编程与创造的时代",
    summary:
      "从认知劳动的重新定价，到技术祭司的黄昏 —— 为什么普通人此刻该重新拿起工具",
    public: true,
    available: true,
  },
  { order: 1, title: "待上传", summary: "", public: true, available: false },
  { order: 2, title: "待上传", summary: "", public: true, available: false },
  { order: 3, title: "待上传", summary: "", public: false, available: false },
  { order: 4, title: "待上传", summary: "", public: false, available: false },
  { order: 5, title: "待上传", summary: "", public: false, available: false },
];
