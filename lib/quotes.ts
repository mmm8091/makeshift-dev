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

/** GitHub 上骚话库文件地址，用于引导学员提 PR 投稿。 */
export const QUOTES_SOURCE_URL =
  "https://github.com/mmm8091/makeshift-dev/blob/main/data/quotes.json";
