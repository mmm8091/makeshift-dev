"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";

export async function checkLoginEmailRegistration(emailInput: string) {
  const email = String(emailInput || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "invalid" as const };
  }

  try {
    const [existingUser] = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return {
      status: existingUser ? ("registered" as const) : ("new" as const),
    };
  } catch (error) {
    console.error("Failed to check login email registration", error);
    return { status: "unknown" as const };
  }
}
