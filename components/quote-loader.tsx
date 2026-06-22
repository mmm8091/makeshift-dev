"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawQuote,
  QUOTE_HANDOFF_KEY,
  QUOTE_STARTED_KEY,
  QUOTES_SOURCE_URL,
  type Quote,
} from "@/lib/quotes";

/**
 * 骚话画面的展示外观（印记动画 + 骚话 + 出处 + 投稿钩子）。
 * 纯展示，供加载页与文章补时遮罩共用，保证两处视觉一致、衔接无缝。
 * `quote` 为空时只显示印记与占位，文字淡入由 `visible` 控制。
 */
export function QuoteLoaderView({
  quote,
  visible,
}: {
  quote: Quote | null;
  visible: boolean;
}) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
      <span className="quote-loader-mark" aria-hidden />
      <p className="kicker mt-8" aria-hidden>
        正在翻印
      </p>

      <blockquote
        className={`mt-5 min-h-[3.5em] max-w-2xl font-serif text-2xl leading-relaxed text-ink transition-opacity duration-700 sm:text-3xl ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-live="polite"
      >
        {quote ? quote.text : " "}
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
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        想加一句骚话？提个 PR →
      </a>
    </section>
  );
}

/**
 * 文章加载页：随机抽一句骚话陪读者等待，并把这句和出现时刻暂存到
 * sessionStorage，让随后进入的文章取回同一句、并据时间戳补足最短展示时长。
 *
 * 首屏不带文字（避免服务端/客户端随机不一致的水合警告），挂载后淡入。
 */
export function QuoteLoader() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const chosen = useRef<Quote | null>(null);

  useEffect(() => {
    if (chosen.current) {
      setQuote(chosen.current);
      return;
    }
    const q = drawQuote();
    chosen.current = q;
    try {
      sessionStorage.setItem(QUOTE_HANDOFF_KEY, JSON.stringify(q));
      sessionStorage.setItem(QUOTE_STARTED_KEY, String(Date.now()));
    } catch {
      // sessionStorage 不可用（隐私模式等）时静默降级：题记会自行随机一句。
    }
    setQuote(q);
  }, []);

  return <QuoteLoaderView quote={quote} visible={quote !== null} />;
}
