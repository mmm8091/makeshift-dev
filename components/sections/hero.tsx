import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 pt-16 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
        {/* 文案 */}
        <div>
          <p className="kicker">平民编程 · AI 编程 · 互助学习</p>
          <h1 className="misprint mt-4 font-display text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl">
            数字时代的
            <br />
            <span className="text-red">识字班</span>
          </h1>
          <p className="ink-bold mt-6 max-w-xl font-serif text-2xl leading-snug text-ink">
            草台编子，正经造物
            <br />
            你的意志值得<span className="text-red">被运行</span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/courses/preface"
              className="inline-flex items-center border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:bg-red hover:border-red"
            >
              先读前言 →
            </Link>
            <Link
              href="/enroll"
              className="inline-flex items-center border-2 border-ink bg-transparent px-6 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              如何报名
            </Link>
          </div>
        </div>

        {/* 木刻插画：精神段落，而非说明图。与课程卡片同款墨色硬投影 */}
        <figure className="print-block relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/hero-home.png"
            alt="工人版画：草台帐篷下的夜校，暖灯里几桌人在敲键盘，中央一株发光的野草长成电路"
            className="aspect-video w-full object-cover"
          />
          <figcaption className="border-t-2 border-ink bg-paper-2 px-4 py-2 font-serif text-sm text-ink-soft">
            世界的代码正在重写，而创造者的席位永远稀缺
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
