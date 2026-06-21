import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { UserCenter } from "@/components/me/user-center";
import { getDb } from "@/db/client";
import { entitlements, profiles } from "@/db/schema";
import { createAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "用户中心" };

export default async function MePage() {
  const { env } = await getCloudflareContext({ async: true });
  const session = await createAuth(env).api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const db = getDb(env);
  await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      displayName: session.user.name,
    })
    .onConflictDoNothing();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  const userEntitlements = await db
    .select({ scope: entitlements.scope })
    .from(entitlements)
    .where(eq(entitlements.userId, session.user.id));

  return (
    <UserCenter
      user={{
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        name: session.user.name,
        image: session.user.image,
      }}
      profile={{
        displayName: profile?.displayName || session.user.name,
        qqNumber: profile?.qqNumber || null,
        bio: profile?.bio || null,
        role: profile?.role || "student",
      }}
      entitlementScopes={userEntitlements.map((item) => item.scope)}
    />
  );
}
