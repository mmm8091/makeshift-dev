import { Logo } from "@/components/logo";
import { SITE, APP_VERSION, APP_BUILD_SHA } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-paper-2">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex items-start gap-3">
          <Logo className="h-10 w-10" withPlate={false} />
          <div>
            <p className="font-display text-base font-extrabold">
              草台编子识字班
            </p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-faint">
              一个面向普通人的数字时代识字班。平民编程、AI 编程、互助学习 ——
              从消费者到创造者
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 text-xs text-ink-faint">
          <span>
            代码与协作公开于{" "}
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-red"
            >
              GitHub
            </a>
          </span>
          <span className="font-mono">
            v{APP_VERSION} · {APP_BUILD_SHA}
          </span>
        </div>
      </div>
    </footer>
  );
}
