import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// 正文衬线：思源宋体，替换又细又糙的系统宋体。CJK 字体较大，关闭 preload，按需加载。
const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-serif-sc",
});

export const metadata: Metadata = {
  title: {
    default: "草台编子识字班",
    template: "%s · 草台编子识字班",
  },
  description:
    "一个面向普通人的数字时代识字班：平民编程、AI 编程、互助学习。学会用 AI 和代码完成真实创造。",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  openGraph: {
    title: "草台编子识字班",
    description:
      "面向普通人的数字时代识字班：平民编程、AI 编程、互助学习，从消费者到创造者。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f0df",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={notoSerifSC.variable}>
      <head>
        {/* 正文字体：霞鹜文楷（CDN 自带 unicode-range 子集化按需加载）。
            后续可改为自托管子集，去掉对外部 CDN 的依赖。 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css"
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
