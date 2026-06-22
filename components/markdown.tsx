import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";

/** 课程正文渲染：把 Markdown 映射到暖纸讲义版式（霞鹜文楷正文 + 黑体小节标题）。 */
const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-12 mb-4 font-display text-2xl font-black">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-14 mb-4 font-display text-2xl font-black">
      <span className="text-red">／ </span>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-12 mb-3 border-t-2 border-ink pt-8 font-display text-xl font-extrabold">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="ink-bold">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-bold text-ink">{children}</strong>
  ),
  hr: () => <hr className="my-10 h-[3px] w-full border-0 bg-ink/80" />,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-red bg-paper-2 px-5 py-3 text-ink-soft">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-red underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
  ),
  code: ({ children }) => (
    <code className="rounded-sm bg-paper-3 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // 前言四图等课程插图：木刻横铺，墨边框。alt 仅用于无障碍，不显示标签
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className="my-8 block w-full border-2 border-ink"
      />
    ) : null,
};

export function CourseMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose-letterpress">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkCjkFriendly]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
