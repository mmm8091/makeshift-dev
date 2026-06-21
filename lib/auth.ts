import { betterAuth } from "better-auth";
import { SITE } from "@/lib/site";

export function createAuth(env: CloudflareEnv) {
  const github =
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : undefined;

  return betterAuth({
    appName: SITE.name,
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: github,
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
