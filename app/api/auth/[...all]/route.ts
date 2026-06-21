import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

async function authHandler(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  return createAuth(env).handler(request);
}

export async function GET(request: Request) {
  return authHandler(request);
}

export async function POST(request: Request) {
  return authHandler(request);
}
