"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuoteLoaderView } from "@/components/quote-loader";
import {
  pickRandomQuote,
  QUOTE_HANDOFF_KEY,
  QUOTE_MIN_DISPLAY_MS,
  QUOTE_STARTED_KEY,
  type Quote,
} from "@/lib/quotes";

// 客户端用 layout effect 在绘制前决定是否补时，避免正文闪一下；
// 服务端退回普通 effect（仅为消除 SSR 告警，此时本就不补时）。
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * 文章补时遮罩：经加载页（软跳转）进入时，若骚话画面显示不足
 * {@link QUOTE_MIN_DISPLAY_MS}，用同一句骚话的全屏遮罩补满剩余时间，
 * 再揭开正文，避免一闪而过。硬刷新/直达没有时间戳，不补时。
 *
 * 放在文章顶部、题记之前：它只读取暂存的骚话（不清除），
 * 由题记负责 consume-once 清除，两处显示同一句。
 */
export function QuoteHold() {
  const [holding, setHolding] = useState(false);
  const quoteRef = useRef<Quote | null>(null);

  useIsomorphicLayoutEffect(() => {
    let startedAt = 0;
    let quote: Quote | null = null;
    try {
      const t = sessionStorage.getItem(QUOTE_STARTED_KEY);
      if (t) startedAt = Number(t);
      const raw = sessionStorage.getItem(QUOTE_HANDOFF_KEY);
      if (raw) quote = JSON.parse(raw) as Quote;
      // 时间戳是一次性的：读完即清，back/forward 或刷新不再补时。
      sessionStorage.removeItem(QUOTE_STARTED_KEY);
    } catch {
      return;
    }

    if (!startedAt) return; // 硬刷新/直达：未经加载页，不补时。
    const remaining = QUOTE_MIN_DISPLAY_MS - (Date.now() - startedAt);
    if (remaining <= 0) return; // 加载已够久，直接显示正文。

    quoteRef.current = quote ?? pickRandomQuote();
    setHolding(true);
    const id = window.setTimeout(() => setHolding(false), remaining);
    return () => window.clearTimeout(id);
  }, []);

  if (!holding) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper">
      <QuoteLoaderView quote={quoteRef.current} visible />
    </div>
  );
}
