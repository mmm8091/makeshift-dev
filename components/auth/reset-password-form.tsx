"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth-card";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const requestReset = async (formData: FormData) => {
    const nextEmail = String(formData.get("email") || "").trim().toLowerCase();
    setIsPending(true);
    setNotice("");

    const { error } = await authClient.emailOtp.requestPasswordReset({
      email: nextEmail,
    });

    if (error) {
      setNotice(error.message || "验证码发送失败，请稍后再试");
      setIsPending(false);
      return;
    }

    setEmail(nextEmail);
    setCooldown(60);
    setNotice("验证码已发送，请查看邮箱");
    setIsPending(false);
  };

  const resetPassword = async (formData: FormData) => {
    const otp = String(formData.get("emailCode") || "").trim();
    const password = String(formData.get("password") || "");
    setIsPending(true);
    setNotice("");

    const resetResult = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });

    if (resetResult.error) {
      setNotice(resetResult.error.message || "验证码无效或已过期");
      setIsPending(false);
      return;
    }

    const signInResult = await authClient.signIn.email({
      email,
      password,
    });

    if (signInResult.error) {
      setNotice("密码已更新，请回到登录页用新密码登录");
      setIsPending(false);
      return;
    }

    router.push("/courses/enroll");
    router.refresh();
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setCooldown(60);
    setNotice("");
    const { error } = await authClient.emailOtp.requestPasswordReset({ email });
    if (error) {
      setNotice(error.message || "验证码重发失败，请稍后再试");
      setCooldown(0);
      return;
    }
    setNotice("验证码已重新发送，请查看邮箱");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void (email
          ? resetPassword(new FormData(e.currentTarget))
          : requestReset(new FormData(e.currentTarget)));
      }}
      className="space-y-4"
    >
      {!email && (
        <Field
          label="邮箱"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      )}

      {email && (
        <>
          <div>
            <span className="font-serif text-sm font-bold text-ink">
              邮箱验证码
            </span>
            <p className="mt-1 font-serif text-sm text-ink-soft">
              验证码已发送到 {email}
            </p>
            <div className="mt-1.5 flex gap-2">
              <input
                name="emailCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位验证码"
                required
                className="w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void resend()}
                disabled={cooldown > 0}
                className="shrink-0 border-2 border-ink bg-paper px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50 disabled:hover:bg-paper disabled:hover:text-ink"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : "重发"}
              </button>
            </div>
          </div>
          <Field
            label="新密码"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="至少 8 位"
            required
          />
        </>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
      >
        {isPending ? "正在处理" : email ? "更新密码" : "发送验证码"}
      </button>

      {notice && (
        <p className="border-l-4 border-red bg-paper-2 px-3 py-2 font-serif text-sm text-ink-soft">
          {notice}
        </p>
      )}
    </form>
  );
}
