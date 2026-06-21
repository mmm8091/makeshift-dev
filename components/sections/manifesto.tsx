const PILLARS = [
  {
    title: "技术祛魅",
    body: "看懂报错、看懂结构、看懂别人写的轮子。编程从来不是天才的专利，代码只是廉价的表象",
  },
  {
    title: "数字主权",
    body: "做出自己的工具、平台、自动化流水线，在数字世界里插上你自己的旗",
  },
  {
    title: "互助网络",
    body: "草台是一起搭起来的，不依附平台，不受雇于大厂，自己掌握数据、工具和收入来源",
  },
];

/** 深色木刻区：整站偏暖纸，这里用一块近黑暖底做"精神段落"的重量。 */
export function Manifesto() {
  return (
    <section className="relative isolate overflow-hidden bg-woodcut text-paper">
      {/* 背景插画压暗 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/lode.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-woodcut via-woodcut/85 to-woodcut/40" />

      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="kicker text-gold">为什么是现在</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-black leading-snug text-paper sm:text-4xl">
          认知劳动正在被重新定价
          <br />
          这一次，普通人该重新拿起工具
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden border-2 border-paper/30 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="bg-woodcut-2/80 p-6 outline outline-1 -outline-offset-[0.5px] outline-paper/15"
            >
              <h3 className="font-display text-xl font-extrabold text-paper">
                <span className="text-red">/ </span>
                {p.title}
              </h3>
              <p className="ink-bold mt-3 font-serif text-[0.95rem] leading-relaxed text-paper/80">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
