"use client";

import { useEffect, useRef, useState } from "react";
import {
  pickRandomQuote,
  QUOTE_HANDOFF_KEY,
  QUOTES_SOURCE_URL,
  type Quote,
} from "@/lib/quotes";

/**
 * 文章加载页：随机抽一句骚话陪读者等待，并把这句暂存到 sessionStorage，
 * 让随后进入的文章题记取回同一句，做到从加载到正文的视觉连贯。
 *
 * 首屏不带文字（避免服务端/客户端随机不一致的水合警告），
 * 客户端挂载后淡入骚话。
 */
export function QuoteLoader() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const chosen = useRef<Quote | null>(null);

  useEffect(() => {
    if (chosen.current) {
      setQuote(chosen.current);
      return;
    }
    const q = pickRandomQuote();
    chosen.current = q;
    try {
      sessionStorage.setItem(QUOTE_HANDOFF_KEY, JSON.stringify(q));
    } catch {
      // sessionStorage 不可用（隐私模式等）时静默降级：题记会自行随机一句。
    }
    setQuote(q);
  }, []);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
      <span className="quote-loader-mark" aria-hidden />
      <p className="kicker mt-8" aria-hidden>
        正在翻印
      </p>

      <blockquote
        className={`mt-5 min-h-[3.5em] max-w-2xl font-serif text-2xl leading-relaxed text-ink transition-opacity duration-700 sm:text-3xl ${
          quote ? "opacity-100" : "opacity-0"
        }`}
        aria-live="polite"
      >
        {quote ? quote.text : " "}
      </blockquote>

      {quote?.source && (
        <cite className="mt-4 font-serif text-base not-italic text-ink-faint">
          —— {quote.source}
        </cite>
      )}

      <a
        href={QUOTES_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-10 font-serif text-sm text-ink-faint underline-offset-4 transition-opacity duration-700 hover:text-red hover:underline ${
          quote ? "opacity-100" : "opacity-0"
        }`}
      >
        想加一句骚话？提个 PR →
      </a>
    </section>
  );
}
