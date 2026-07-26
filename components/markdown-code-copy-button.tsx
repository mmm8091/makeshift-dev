"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function MarkdownCodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
  };

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={copied ? "已复制代码" : "复制代码"}
      aria-label={copied ? "已复制代码" : "复制代码"}
      className="markdown-code-copy"
    >
      <Icon aria-hidden="true" size={15} strokeWidth={2.4} />
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}
