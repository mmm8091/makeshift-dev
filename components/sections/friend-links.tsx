type Friend = {
  name: string;
  /** 一句关系/由来，放在红色小签里 */
  tag: string;
  /** 这是什么 */
  desc: string;
  /** 展示用的站点标识 */
  label: string;
  href: string;
};

const FRIENDS: Friend[] = [
  {
    name: "普罗早餐店",
    tag: "B站账号",
    desc: "感谢普罗早餐店社群支持",
    label: "space.bilibili.com",
    href: "https://space.bilibili.com/3546749736061739?spm_id_from=333.337.0.0",
  },
  {
    name: "火合网",
    tag: "商业系统",
    desc: "自营私域商业系统，寻找商业网络共建者",
    label: "next.firco.cn",
    href: "https://next.firco.cn/page/index",
  },
];

export function FriendLinks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <p className="kicker">友情链接</p>
      <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">
        一个人搭不起草台
      </h2>
      <p className="ink-bold mt-4 max-w-2xl font-serif text-ink-soft">
        在不同时候递过一把火的人和事，记在这里
      </p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {FRIENDS.map((f) => (
          <li key={f.href}>
            <a
              href={f.href}
              target="_blank"
              rel="noreferrer"
              className="print-block group flex h-full flex-col p-6 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-xl font-extrabold group-hover:text-red">
                  {f.name}
                </h3>
                <span className="shrink-0 border border-red px-2 py-0.5 text-xs font-bold text-red">
                  {f.tag}
                </span>
              </div>

              <p className="ink-bold mt-3 flex-1 font-serif text-[0.95rem] leading-relaxed text-ink-soft">
                {f.desc}
              </p>

              <span className="mt-5 inline-flex items-center gap-1 font-mono text-sm text-ink-faint group-hover:text-red">
                {f.label}
                <span aria-hidden>↗</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
