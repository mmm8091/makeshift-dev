import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "更新密码" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      kicker="更新密码"
      title="用邮箱验证码更新密码"
      footer={
        <>
          想起密码了？
          <Link href="/login" className="font-bold text-red hover:underline">
            回去登录
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
