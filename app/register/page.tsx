import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "注册" };

function normalizeEmailParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return "";
  return String(value || "").trim().toLowerCase();
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; from?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialEmail = normalizeEmailParam(params.email);
  const fromLogin = params.from === "login";

  return (
    <AuthCard
      kicker="注册"
      title="加入草台"
      footer={
        <>
          已有账号？
          <Link href="/login" className="font-bold text-red hover:underline">
            去登录
          </Link>
        </>
      }
    >
      <RegisterForm initialEmail={initialEmail} fromLogin={fromLogin} />
    </AuthCard>
  );
}
