import type { Element, RootContent } from "hast";
import { FileCode2, SquareTerminal } from "lucide-react";
import type { ReactNode } from "react";
import { MarkdownCodeCopyButton } from "@/components/markdown-code-copy-button";

type CodeBlockVariant = "document" | "terminal";
type CodeBlockDensity = "course" | "forum";

const TERMINAL_LANGUAGES = new Set([
  "bash",
  "bat",
  "batch",
  "cmd",
  "console",
  "powershell",
  "ps1",
  "pwsh",
  "shell",
  "sh",
  "terminal",
  "zsh",
]);

const WRAPPED_LANGUAGES = new Set([
  "markdown",
  "md",
  "plaintext",
  "text",
  "txt",
]);

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "SHELL",
  batch: "BATCH",
  cmd: "CMD",
  console: "TERMINAL",
  js: "JAVASCRIPT",
  jsx: "JAVASCRIPT",
  markdown: "MARKDOWN",
  md: "MARKDOWN",
  powershell: "POWERSHELL",
  ps1: "POWERSHELL",
  pwsh: "POWERSHELL",
  sh: "SHELL",
  shell: "SHELL",
  terminal: "TERMINAL",
  ts: "TYPESCRIPT",
  tsx: "TYPESCRIPT",
  txt: "TEXT",
  text: "TEXT",
  plaintext: "TEXT",
  yml: "YAML",
};

type CodeBlockInfo = {
  code: string;
  language: string;
  label: string;
  variant: CodeBlockVariant;
  wraps: boolean;
};

export function MarkdownCodeBlock({
  children,
  node,
  density,
}: {
  children: ReactNode;
  node?: Element;
  density: CodeBlockDensity;
}) {
  const info = getCodeBlockInfo(node);
  const Icon = info.variant === "terminal" ? SquareTerminal : FileCode2;

  return (
    <figure
      className={`markdown-code-block markdown-code-block--${info.variant} markdown-code-block--${density}`}
      data-wrap={info.wraps ? "true" : "false"}
    >
      <figcaption className="markdown-code-caption">
        <span className="markdown-code-language">
          <Icon aria-hidden="true" size={16} strokeWidth={2.4} />
          {info.label}
        </span>
        <MarkdownCodeCopyButton code={info.code} />
      </figcaption>
      <pre>{children}</pre>
    </figure>
  );
}

export function MarkdownInlineOrBlockCode({
  children,
  className,
  ...props
}: {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const block =
    Boolean(className?.includes("language-")) ||
    Boolean(className?.includes("hljs")) ||
    reactText(children).includes("\n");

  if (block) {
    return (
      <code {...props} className={className}>
        {children}
      </code>
    );
  }

  return (
    <code
      {...props}
      className="rounded-sm bg-paper-3 px-1.5 py-0.5 font-mono text-[0.9em]"
    >
      {children}
    </code>
  );
}

function getCodeBlockInfo(preNode?: Element): CodeBlockInfo {
  const codeNode = preNode?.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );
  const classes = codeNode?.properties.className;
  const classNames = Array.isArray(classes) ? classes.map(String) : [];
  const languageClass = classNames.find((name) =>
    name.startsWith("language-"),
  );
  const language = (languageClass?.slice("language-".length) || "text").toLowerCase();
  const variant = TERMINAL_LANGUAGES.has(language) ? "terminal" : "document";

  return {
    code: codeNode ? hastText(codeNode).replace(/\n$/, "") : "",
    language,
    label: LANGUAGE_LABELS[language] || language.toUpperCase(),
    variant,
    wraps: WRAPPED_LANGUAGES.has(language),
  };
}

function hastText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

function reactText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(reactText).join("");
  return "";
}
