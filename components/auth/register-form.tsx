"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, OrDivider } from "@/components/auth-card";
import { GitHubIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [isGitHubPending, setIsGitHubPending] = useState(false);
  const [verification, setVerification] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // 发送验证码后的倒计时重发
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    if (cooldown > 0) return;
    if (!verification) return;
    setNotice("");
    setCooldown(60);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: verification.email,
        type: "email-verification",
      });
      if (error) {
        setNotice(error.message || "验证码重发失败，请稍后再试");
        setCooldown(0);
        return;
      }
      setNotice("验证码已重新发送，请查看邮箱");
    } catch (error) {
      console.error(error);
      setNotice("验证码重发请求没有完成，请检查网络后再试");
      setCooldown(0);
    }
  };

  const registerWithEmail = async (formData: FormData) => {
    const name = String(formData.get("displayName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    setIsEmailPending(true);
    setNotice("");

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        setNotice(error.message || "注册失败，请稍后再试");
        setIsEmailPending(false);
        return;
      }

      const otpResult = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (otpResult.error) {
        setNotice(otpResult.error.message || "账号已创建，但验证码发送失败");
        setVerification({ email, password });
        setIsEmailPending(false);
        return;
      }

      setVerification({ email, password });
      setCooldown(60);
      setNotice("验证码已发送，请查看邮箱后完成注册");
    } catch (error) {
      console.error(error);
      setNotice("注册请求没有完成，请检查网络后再试");
    } finally {
      setIsEmailPending(false);
    }
  };

  const verifyEmail = async (formData: FormData) => {
    if (!verification) return;
    const otp = String(formData.get("emailCode") || "").trim();
    setIsEmailPending(true);
    setNotice("");

    try {
      const verificationResult = await authClient.emailOtp.verifyEmail({
        email: verification.email,
        otp,
      });

      if (verificationResult.error) {
        setNotice(verificationResult.error.message || "验证码无效或已过期");
        return;
      }

      const signInResult = await authClient.signIn.email({
        email: verification.email,
        password: verification.password,
      });

      if (signInResult.error) {
        setNotice(
          signInResult.error.message || "邮箱已验证，请回到登录页输入密码登录",
        );
        return;
      }

      router.push("/me");
      router.refresh();
    } catch (error) {
      console.error(error);
      setNotice("验证码校验请求没有完成，请检查网络后再试");
    } finally {
      setIsEmailPending(false);
    }
  };

  const signInWithGitHub = async () => {
    setIsGitHubPending(true);
    setNotice("");
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/me",
    });
    if (error) {
      setNotice(error.message || "GitHub 注册暂时失败，请稍后再试");
      setIsGitHubPending(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void (verification
            ? verifyEmail(new FormData(e.currentTarget))
            : registerWithEmail(new FormData(e.currentTarget)));
        }}
        className="space-y-4"
      >
        {!verification && (
          <>
            <Field
              label="昵称"
              name="displayName"
              autoComplete="nickname"
              placeholder="别人会怎么称呼你"
              required
            />
            <Field
              label="邮箱"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <Field
              label="密码"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="至少 8 位"
              required
            />
            <Field
              label="QQ 号（之后可补）"
              name="qq"
              inputMode="numeric"
              placeholder="注册后在用户中心填写"
              hint="QQ 号会用于显示头像。用户中心接好后再保存它，先把账号注册跑通"
            />
          </>
        )}

        {/* 邮箱验证码 */}
        {verification && (
          <div>
            <span className="font-serif text-sm font-bold text-ink">
              邮箱验证码
            </span>
            <p className="mt-1 font-serif text-sm text-ink-soft">
              验证码已发送到 {verification.email}
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
                onClick={() => void sendCode()}
                disabled={cooldown > 0}
                className="shrink-0 border-2 border-ink bg-paper px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50 disabled:hover:bg-paper disabled:hover:text-ink"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : "重发"}
              </button>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={isEmailPending}
          className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
        >
          {isEmailPending
            ? "正在处理"
            : verification
              ? "完成注册"
              : "创建账号"}
        </button>
      </form>

      <OrDivider />

      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={isGitHubPending}
        className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-paper px-6 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <GitHubIcon className="h-5 w-5" />{" "}
        {isGitHubPending ? "正在前往 GitHub" : "用 GitHub 注册"}
      </button>

      {notice && (
        <p className="mt-5 border-l-4 border-red bg-paper-2 px-3 py-2 font-serif text-sm text-ink-soft">
          {notice}
        </p>
      )}
    </>
  );
}
