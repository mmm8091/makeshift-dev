import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  setDailyDigestPreference,
  verifyUnsubscribeToken,
} from "@/lib/daily-digest";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const userId = await verifyUnsubscribeToken(env, token);
  if (!userId) {
    return html("退订链接无效", "这个链接不对，可能被截断了。登录用户中心也可以关闭每日摘要。", 400);
  }

  await setDailyDigestPreference({
    env,
    userId,
    enabled: false,
    unsubscribedAt: new Date(),
  });
  return html("每日摘要已关闭", "以后不会再发送每日摘要。需要重新开启时，登录用户中心操作即可。");
}

function html(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escapeHtml(
      title,
    )}</title><body style="font-family: serif; max-width: 640px; margin: 64px auto; line-height: 1.8;"><h1>${escapeHtml(
      title,
    )}</h1><p>${escapeHtml(body)}</p><p><a href="/me">回到用户中心</a></p></body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
