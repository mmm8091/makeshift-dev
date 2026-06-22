import quotesData from "@/data/quotes.json";

/** 一条骚话。`source` 为空表示无出处（民间/佚名）。 */
export type Quote = {
  text: string;
  source: string;
};

export const QUOTES: Quote[] = quotesData;

/** 纯随机抽一句骚话（可重复）。仅作降级兜底用。 */
export function pickRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/** 同一浏览器的"抽取袋子"——本轮尚未抽到的骚话下标。 */
const QUOTE_BAG_KEY = "mkshift:quoteBag";

/** 读取袋子，过滤掉越界（骚话被删改后）的陈旧下标。 */
function readBag(): number[] {
  try {
    const raw = localStorage.getItem(QUOTE_BAG_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is number =>
        typeof n === "number" && Number.isInteger(n) && n >= 0 && n < QUOTES.length,
    );
  } catch {
    return [];
  }
}

/**
 * 抽取不放回：同一浏览器内，一轮里不重复抽到同一句，
 * 抽完整轮后全部放回再重新洗。供加载页与文章题记按"每次进文章一次"调用。
 * localStorage 不可用时降级为纯随机。
 */
export function drawQuote(): Quote {
  if (QUOTES.length === 0) return { text: "", source: "" };
  try {
    let bag = readBag();
    if (bag.length === 0) {
      // 袋子空了：把所有骚话放回（含新增的）重新一轮。
      bag = QUOTES.map((_, i) => i);
    }
    const pickAt = Math.floor(Math.random() * bag.length);
    const index = bag[pickAt];
    bag.splice(pickAt, 1);
    localStorage.setItem(QUOTE_BAG_KEY, JSON.stringify(bag));
    return QUOTES[index];
  } catch {
    return pickRandomQuote();
  }
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
