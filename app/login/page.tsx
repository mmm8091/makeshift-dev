import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <AuthCard
      kicker="登录"
      title="回到你的工作台"
      footer={
        <>
          还没有账号？
          <Link href="/register" className="font-bold text-red hover:underline">
            去注册
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
