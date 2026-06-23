import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AgentTokenManager } from "@/components/me/agent-token-manager";
import { createAuth } from "@/lib/auth";
import { listAgentAccessTokens } from "@/lib/agent-access-tokens";

export const metadata: Metadata = { title: "Agent 访问令牌" };

export default async function AgentTokensPage() {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const tokens = await listAgentAccessTokens(env, session.user.id);

  return <AgentTokenManager initialTokens={tokens} />;
}
