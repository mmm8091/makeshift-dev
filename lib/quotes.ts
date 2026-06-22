import quotesData from "@/data/quotes.json";

/** 一条骚话。`source` 为空表示无出处（民间/佚名）。 */
export type Quote = {
  text: string;
  source: string;
};

export const QUOTES: Quote[] = quotesData;

/** 随机抽一句骚话。 */
export function pickRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/**
 * 加载页抽到的骚话在跳转过程中的暂存键。
 * 加载页写入、文章题记取回同一句后清除（consume-once），
 * 这样直接刷新文章时会换一句新的，而经加载页进入则保留同一句。
 */
export const QUOTE_HANDOFF_KEY = "mkshift:quote";

/**
 * 加载页出现时刻的时间戳暂存键。文章页据此判断加载页已显示多久，
 * 不足 {@link QUOTE_MIN_DISPLAY_MS} 时用补时遮罩补满，避免骚话一闪而过。
 * 只有经加载页（软跳转）进入才会写入，硬刷新/直达不写、因而不补时。
 */
export const QUOTE_STARTED_KEY = "mkshift:quoteStartedAt";

/** 骚话画面的最短展示时长（毫秒）：让人至少能读完一眼。 */
export const QUOTE_MIN_DISPLAY_MS = 800;

/** GitHub 上骚话库文件地址，用于引导学员提 PR 投稿。 */
export const QUOTES_SOURCE_URL =
  "https://github.com/mmm8091/makeshift-dev/blob/main/data/quotes.json";
