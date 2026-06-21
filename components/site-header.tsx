import Link from "next/link";
import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "/courses/preface", label: "前言" },
  { href: "/courses", label: "课程" },
  { href: "/forum", label: "论坛" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Logo className="h-12 w-12" withPlate={false} />
          <span className="font-display text-2xl font-extrabold tracking-tight">
            草台编子识字班
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 text-base font-semibold text-ink-soft sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-red"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/courses/enroll"
            className="font-bold text-red transition-colors hover:text-red-deep"
          >
            如何报名
          </Link>
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 仓库"
            className="text-ink-soft transition-colors hover:text-ink"
          >
            <GitHubIcon className="h-6 w-6" />
          </a>
        </nav>

        <Link
          href="/login"
          className="ml-auto sm:ml-0 inline-flex items-center border-2 border-ink bg-ink px-4 py-1.5 text-sm font-bold text-paper transition-colors hover:bg-red hover:border-red"
        >
          登录
        </Link>
      </div>
    </header>
  );
}
