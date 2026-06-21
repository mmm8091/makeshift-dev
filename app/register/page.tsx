import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
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
      <RegisterForm />
    </AuthCard>
  );
}
