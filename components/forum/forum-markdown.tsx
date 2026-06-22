import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";

/**
 * 论坛正文渲染（用户提交内容）。
 *
 * 安全（规格 §6）：
 * - **不引入 `rehype-raw`**：原始 HTML 不渲染，杜绝存储型 XSS（与可信的课程正文区分）。
 * - 链接做协议白名单（仅 http/https/mailto 与站内相对路径），其余一律剥成空。
 * - 外链 `rel="ugc nofollow noreferrer"`，不给用户内容传递权重 / referrer。
 *
 * ⚠️ 必带 `remark-cjk-friendly`：否则 `**中文**` 紧贴中文 / 全角标点时加粗不生效。
 */

/** 协议白名单：允许相对路径与 http/https/mailto，其余返回空串（react-markdown 会丢弃）。 */
function safeUrl(url: string): string {
  if (!url) return "";
  if (/^(https?:|mailto:)/i.test(url)) return url;
  // 相对/锚点：不含协议分隔即视为站内安全链接
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return "";
}

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-8 mb-3 font-display text-xl font-black">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 font-display text-xl font-black">
      <span className="text-red">／ </span>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 font-display text-lg font-extrabold">{children}</h3>
  ),
  p: ({ children }) => <p className="ink-bold">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-bold text-ink">{children}</strong>
  ),
  hr: () => <hr className="my-8 h-[3px] w-full border-0 bg-ink/80" />,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-4 border-red bg-paper-2 px-5 py-3 text-ink-soft">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={typeof href === "string" ? safeUrl(href) : undefined}
      target="_blank"
      rel="ugc nofollow noreferrer"
      className="font-semibold text-red underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>
  ),
  code: ({ children }) => (
    <code className="rounded-sm bg-paper-3 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" && safeUrl(src) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeUrl(src)}
        alt={alt ?? ""}
        loading="lazy"
        className="my-5 block max-w-full border-2 border-ink"
      />
    ) : null,
};

export function ForumMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose-letterpress text-[1rem] leading-[1.9]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        urlTransform={safeUrl}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
