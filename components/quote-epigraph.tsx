"use client";

import { useEffect, useRef, useState } from "react";
import { drawQuote, QUOTE_HANDOFF_KEY, type Quote } from "@/lib/quotes";

/**
 * 文章顶部题记：优先取回加载页暂存的那句骚话（取后即清，consume-once），
 * 取不到则自行随机一句。客户端挂载后淡入，避免水合不一致。
 */
export function QuoteEpigraph() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const chosen = useRef<Quote | null>(null);

  useEffect(() => {
    if (chosen.current) {
      setQuote(chosen.current);
      return;
    }
    let q: Quote | null = null;
    try {
      const raw = sessionStorage.getItem(QUOTE_HANDOFF_KEY);
      if (raw) {
        q = JSON.parse(raw) as Quote;
        sessionStorage.removeItem(QUOTE_HANDOFF_KEY);
      }
    } catch {
      // 忽略 sessionStorage 异常，退回随机。
    }
    if (!q) q = drawQuote();
    chosen.current = q;
    setQuote(q);
  }, []);

  return (
    <figure
      className={`mt-8 min-h-[3.5em] border-l-2 border-red pl-4 transition-opacity duration-700 ${
        quote ? "opacity-100" : "opacity-0"
      }`}
    >
      <blockquote className="font-serif text-lg leading-relaxed text-ink-soft">
        {quote?.text ?? " "}
      </blockquote>
      {quote?.source && (
        <figcaption className="mt-2 font-serif text-sm text-ink-faint">
          —— {quote.source}
        </figcaption>
      )}
    </figure>
  );
}
