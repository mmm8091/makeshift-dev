# Frontend & Content Conventions

前端与内容的"已落地"约定。与 `docs/草台编子识字班产品技术方案.md` 的规划不一致处，以这里的实现为准（实现会反过来同步回方案）。

## 视觉系统

- 基调：**暖纸墨绿**。见 `docs/adr/2026-06-21-warm-paper-green-ui-direction.md`。设计 token 全在 `app/globals.css` 的 `@theme`，改色/字体只动这里。
- 字体：标题用黑体（`--font-display`），长文正文用**霞鹜文楷 LXGW WenKai**（`--font-serif`，CDN 加载，见 `app/layout.tsx`）。霞鹜文楷偏细，正文配 `.ink-bold`（同色细描边）补重。
- 插画：严格走 `docs/草台编子识字班插画美术规范.md` 的重黑红木刻；**页面框架走暖纸，插画只作"精神段落"，不蔓延成整页底色**。
- 复用类：`.print-block`（墨色硬投影印刷块）、`.kicker`（前导红横眉标）、`.prose-letterpress`（讲义正文）、`.ink-bold`。
- 不要漂移到通用 SaaS / 玻璃拟态 / 高饱和多色（见 `docs/agents/collaboration.md`）。

## 文案规矩

- **换行 / 段末省略句号「。」**；段内句号保留。标题、按钮、卡片、段落结尾都不带尾句号。
- 不编造课程内容；未定的统一写「待上传」。
- 文案与插图的**内容方向由 owner 定**；agent 的职责是提需求规格 + 实现，不要用选项逼 owner 选。

## 内容模型：课程 = 文章系统

- **公开正文**：Markdown 存仓库 `content/courses/{slug}.md`，agent 直接改文件、走 PR。
- **付费正文**：存 Cloudflare D1，服务端校验 session + entitlement 后读取；**正文永不进公开仓库 / 前端 bundle / 构建产物**。读取层 seam 在 `lib/content.ts`，未解锁返回 `null`（页面渲染解锁引导，不泄漏正文）。
- **文章清单**：`lib/courses.ts`。`ARTICLES = [报名, ...COURSES]`，报名排第一；首页「课程路径」预览只用 `COURSES`（不含报名）。
- **阅读页**：`app/courses/[slug]/page.tsx`（通用，按 slug 渲染任意文章）。可读 = 公开且 `available`；否则渲染 `Gate`（待上传 / 报名解锁）。
- **章节栏**：`components/chapter-nav.tsx`，可展开抽屉。可读→跳文章；锁住→跳 `ENROLL_HREF`(`/courses/enroll`)；待上传→禁用。文末有上一篇 / 下一篇。
- **课程介绍页**（非文章的课程 landing）：待做。

## Markdown 渲染

- `components/markdown.tsx`：`react-markdown` + `remark-gfm` + **`remark-cjk-friendly`**。
- ⚠️ 必须带 `remark-cjk-friendly`：否则 `**中文**` 紧贴中文 / 全角标点时加粗不生效（CommonMark 的 CJK flanking 问题）。
- 课程插图用 **webp**，放 `public/illustrations/`（源图留在 `设计资产/`）。用 `sharp` 转：`resize ≤1600`、`webp q80`。

## 数据文件

- `data/students.json`：裸数组 `[{ qq, displayName }]`。学员通过 PR 往里加（第一课作业）。
- `data/team.json`：`{ founders: [], instructors: [] }`，元素 `{ qq, displayName }`。
- 头像统一走 `/api/avatar/qq/:qq` 代理，**不直接拼腾讯 URL**。

## 关键目录

`app/`（路由）、`components/`（含 `sections/`）、`lib/`、`content/courses/`（公开正文）、`public/illustrations/`、`data/`。
