import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RedeemCodeAdmin } from "@/components/admin/redeem-code-admin";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";
import { createAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "卡密管理" };

export default async function RedeemCodesAdminPage() {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [profile] = await getDb(env)
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  if (profile?.role !== "admin") {
    redirect("/me");
  }

  return <RedeemCodeAdmin />;
}
