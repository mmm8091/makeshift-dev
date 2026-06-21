"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

/**
 * 顶栏右上角的登录态入口：未登录显示「登录」(实心 CTA)，已登录显示「用户中心」(描边)。
 *
 * 走客户端 useSession 而非服务端读 session：站点头部在根 layout，
 * 服务端读 session 会把首页/课程页从静态打成动态、破坏 SSG。
 * 代价是登录态解析前有一瞬占位，用同尺寸骨架位避免布局跳动。
 */
export function HeaderAuth() {
  const { data, isPending } = authClient.useSession();
  const base = "ml-auto sm:ml-0 inline-flex items-center border-2 px-4 py-1.5 text-sm font-bold transition-colors";

  if (isPending) {
    return (
      <span
        aria-hidden
        className="ml-auto sm:ml-0 inline-flex h-9 w-[88px] border-2 border-edge"
      />
    );
  }

  if (data?.user) {
    return (
      <Link
        href="/me"
        className={`${base} border-ink bg-paper text-ink hover:bg-ink hover:text-paper`}
      >
        用户中心
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className={`${base} border-ink bg-ink text-paper hover:border-red hover:bg-red`}
    >
      登录
    </Link>
  );
}
