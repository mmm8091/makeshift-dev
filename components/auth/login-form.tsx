"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, OrDivider } from "@/components/auth-card";
import { GitHubIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [isGitHubPending, setIsGitHubPending] = useState(false);

  const signInWithEmail = async (formData: FormData) => {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    setIsEmailPending(true);
    setNotice("");

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setNotice(
          error.message || "登录失败，请检查邮箱、密码，或确认邮箱已经验证",
        );
        setIsEmailPending(false);
        return;
      }

      router.push("/me");
      router.refresh();
    } catch (error) {
      console.error(error);
      setNotice("登录请求没有完成，请检查网络后再试");
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
      setNotice(error.message || "GitHub 登录暂时失败，请稍后再试");
      setIsGitHubPending(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void signInWithEmail(new FormData(e.currentTarget));
        }}
        className="space-y-4"
      >
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
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <div className="-mt-2 text-right font-serif text-sm text-ink-soft">
          <Link href="/reset-password" className="font-bold text-red">
            忘记密码？
          </Link>
        </div>
        <button
          type="submit"
          disabled={isEmailPending}
          className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
        >
          {isEmailPending ? "正在登录" : "登录"}
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
        {isGitHubPending ? "正在前往 GitHub" : "用 GitHub 登录"}
      </button>

      {notice && (
        <p className="mt-5 border-l-4 border-red bg-paper-2 px-3 py-2 font-serif text-sm text-ink-soft">
          {notice}
        </p>
      )}
    </>
  );
}
