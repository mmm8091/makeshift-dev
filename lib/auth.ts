import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";
import { sendAuthOTPEmail } from "@/lib/email/auth-email";
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
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      autoSignInAfterVerification: false,
      sendOnSignUp: false,
    },
    socialProviders: github,
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        storeOTP: "encrypted",
        resendStrategy: "reuse",
        overrideDefaultEmailVerification: true,
        rateLimit: {
          window: 60,
          max: 3,
        },
        sendVerificationOTP: async (data) => {
          await sendAuthOTPEmail(env, data);
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await getDb(env)
              .insert(profiles)
              .values({
                userId: user.id,
                displayName: user.name,
              })
              .onConflictDoNothing();
          },
        },
      },
    },
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
