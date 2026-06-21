import { type NextRequest } from "next/server";

/**
 * QQ 头像代理。
 *
 * 前端永远只引用 /api/avatar/qq/:qq，不直接拼腾讯头像 URL（见 CONTEXT.md）。
 * 服务端校验 QQ 号格式后，短缓存代理腾讯公开头像源，头像变更后缓存过期即自动更新。
 * 校验失败或上游异常时，返回站点默认占位头像（野草芽）。
 */

const CACHE_SECONDS = 60 * 60 * 24; // 24h
const CACHE_HEADER = `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=604800`;

/** 默认占位头像：暖纸底上的一株野草芽，与 logo 同源气质。 */
function defaultAvatar(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#EFE6CF"/>
  <path d="M40 78c4-3 8-4 10-4s6 1 10 4c-4 3-7 4-10 4s-6-1-10-4z" fill="#20352B"/>
  <path d="M50 74V38" stroke="#20352B" stroke-width="6" stroke-linecap="round"/>
  <path d="M50 58c-6-3-10-8-12-14" stroke="#20352B" stroke-width="5" stroke-linecap="round"/>
  <path d="M50 54c6-3 10-7 12-13" stroke="#20352B" stroke-width="5" stroke-linecap="round"/>
  <circle cx="62" cy="38" r="4" fill="#D7A83F"/>
</svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ qq: string }> },
) {
  const { qq } = await params;

  // 只允许纯数字 QQ 号，长度 5–12 位
  if (!/^\d{5,12}$/.test(qq)) {
    return defaultAvatar();
  }

  const upstream = `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=100`;

  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0" },
      // 让上游响应可被边缘缓存
      cache: "force-cache",
    });

    if (!res.ok || !res.body) {
      return defaultAvatar();
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": CACHE_HEADER,
      },
    });
  } catch {
    return defaultAvatar();
  }
}
