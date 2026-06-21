import Link from "next/link";
import students from "@/data/students.json";
import team from "@/data/team.json";
import { QQAvatar } from "@/components/qq-avatar";

type Person = { qq: string; displayName: string };

const GRID_COLS = "grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10";

/** 头像方块：悬停时昵称从底部滑入，留在方块内（兼容滚动容器，不被裁切） */
function AvatarTile({ person }: { person: Person }) {
  return (
    <div className="group relative overflow-hidden border-2 border-ink bg-paper transition-colors hover:border-red">
      <QQAvatar qq={person.qq} name={person.displayName} />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full truncate bg-ink/90 px-1 py-0.5 text-center text-xs font-bold text-paper transition-transform group-hover:translate-y-0">
        {person.displayName}
      </span>
    </div>
  );
}

/** 档次行：标签 + 与学员同款网格 tile（大小、排版一致） */
function Tier({ label, people }: { label: string; people: Person[] }) {
  return (
    <div>
      <span className="kicker text-ink">{label}</span>
      <ul className={`mt-3 ${GRID_COLS}`}>
        {people.map((p, i) => (
          <li key={`${label}-${i}`}>
            <AvatarTile person={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudentWall() {
  const list = students as Person[];
  const { founders, instructors } = team as {
    founders: Person[];
    instructors: Person[];
  };

  return (
    <section className="border-y-2 border-ink bg-paper-2">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="kicker">学员墙</p>
        <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">
          草台是这些人一起搭的
        </h2>
        <p className="ink-bold mt-4 max-w-2xl font-serif text-ink-soft">
          你需要自己提交代码，把头像放上这面墙
        </p>

        <div className="mt-10 space-y-8">
          <Tier label="创始人" people={founders} />
          <Tier label="在职讲师" people={instructors} />

          {/* 学员：独立滚动，封顶高度，承载后续数百人 */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="kicker text-ink">学员</span>
              <span className="font-serif text-sm text-ink-faint">
                {list.length} 人
              </span>
            </div>

            <div className="mt-3 max-h-[24rem] overflow-y-auto border-2 border-edge bg-paper p-3">
              <ul className={GRID_COLS}>
                {list.map((s, i) => (
                  <li key={`${s.qq}-${i}`}>
                    <AvatarTile person={s} />
                  </li>
                ))}
                <li>
                  <Link
                    href="/enroll"
                    aria-label="把自己加进学员墙"
                    className="flex aspect-square items-center justify-center border-2 border-dashed border-red bg-paper font-display text-2xl font-black text-red transition-colors hover:bg-red hover:text-paper"
                  >
                    +
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/enroll"
            className="inline-flex items-center border-2 border-ink bg-transparent px-5 py-2.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            如何把自己加进来 →
          </Link>
        </div>
      </div>
    </section>
  );
}
