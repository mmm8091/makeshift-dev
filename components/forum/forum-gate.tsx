import Link from "next/link";

/**
 * 论坛解锁引导。复用课程页 Gate 的同款形态（print-block + kicker + 报名按钮），
 * 在未解锁时渲染，绝不泄漏论坛正文（规格 §2 / §7）。
 */
export function ForumGate() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="print-block p-8">
        <p className="kicker">报名解锁</p>
        <h1 className="misprint mt-3 font-display text-3xl font-black">
          论坛是识字班的工棚
        </h1>
        <p className="ink-bold mt-4 font-serif text-lg text-ink-soft">
          这里是报名学员互助、交作业、钉避坑笔记的地方，需要报名解锁后参与
        </p>
        <Link
          href="/courses/enroll"
          className="mt-6 inline-flex items-center border-2 border-ink bg-ink px-5 py-2.5 font-bold text-paper transition-colors hover:border-red hover:bg-red"
        >
          如何报名 →
        </Link>
      </div>
    </div>
  );
}
