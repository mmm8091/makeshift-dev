import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export function getDb(env?: Pick<CloudflareEnv, "DB">) {
  const binding = env?.DB ?? getCloudflareContext().env.DB;
  if (!binding) {
    throw new Error("Missing Cloudflare D1 binding: DB");
  }

  return drizzle(binding, { schema });
}

export type Db = ReturnType<typeof getDb>;
