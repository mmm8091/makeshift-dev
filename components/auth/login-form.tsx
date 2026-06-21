"use client";

import { useState } from "react";
import { Field, OrDivider } from "@/components/auth-card";
import { GitHubIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [notice, setNotice] = useState("");
  const [isGitHubPending, setIsGitHubPending] = useState(false);
  const pending = () => setNotice("账号系统正在接入（Better Auth），敬请期待");
  const signInWithGitHub = async () => {
    setIsGitHubPending(true);
    setNotice("");
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/courses/enroll",
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
          pending();
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
        <button
          type="submit"
          className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
        >
          登录
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
