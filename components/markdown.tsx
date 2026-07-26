import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import {
  MarkdownCodeBlock,
  MarkdownInlineOrBlockCode,
} from "@/components/markdown-code-block";
import {
  MarkdownTable,
  MarkdownTableCell,
  MarkdownTableHead,
  MarkdownTableHeaderCell,
  MarkdownTableRow,
} from "@/components/markdown-table";
import { markdownHighlightOptions } from "@/lib/markdown-highlight";

/** 课程正文渲染：把 Markdown 映射到暖纸讲义版式（霞鹜文楷正文 + 黑体小节标题）。 */
const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-12 mb-4 font-display text-2xl font-black">{children}</h2>
  ),
  h2: ({ children, id, className, node: _node, ...props }) =>
    id === "footnote-label" ? (
      <h2 id={id} className={className} {...props}>
        {children}
      </h2>
    ) : (
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
  a: ({ href, children, node: _node, className: _className, ...props }) => {
    const isPageAnchor = typeof href === "string" && href.startsWith("#");

    return (
      <a
        {...props}
        href={href}
        target={isPageAnchor ? undefined : "_blank"}
        rel={isPageAnchor ? undefined : "noreferrer"}
        className="font-semibold text-red underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
  ),
  pre: ({ children, node }) => (
    <MarkdownCodeBlock node={node} density="course">
      {children}
    </MarkdownCodeBlock>
  ),
  code: ({ node: _node, ...props }) => (
    <MarkdownInlineOrBlockCode {...props} />
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
  table: ({ children }) => (
    <MarkdownTable density="course">{children}</MarkdownTable>
  ),
  thead: MarkdownTableHead,
  tr: MarkdownTableRow,
  th: (props) => <MarkdownTableHeaderCell {...props} density="course" />,
  td: (props) => <MarkdownTableCell {...props} density="course" />,
};

export function CourseMarkdown({ markdown }: { markdown: string }) {
  const bodyMarkdown = stripLeadingTitleHeading(markdown);

  return (
    <div className="prose-letterpress">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkCjkFriendly]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false }],
          [rehypeHighlight, markdownHighlightOptions],
        ]}
        components={components}
      >
        {bodyMarkdown}
      </ReactMarkdown>
    </div>
  );
}

export function stripLeadingTitleHeading(markdown: string) {
  return markdown.replace(
    /^\uFEFF?(?:[ \t]*\r?\n)*# [^\r\n]*(?:\r?\n)?(?:[ \t]*\r?\n)*/,
    "",
  );
}
