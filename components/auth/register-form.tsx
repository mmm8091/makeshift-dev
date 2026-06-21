"use client";

import { useEffect, useState } from "react";
import { Field, OrDivider } from "@/components/auth-card";
import { GitHubIcon } from "@/components/icons";

export function RegisterForm() {
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const pending = () => setNotice("账号系统正在接入（Better Auth），敬请期待");

  // 发送验证码后的倒计时重发
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = () => {
    if (cooldown > 0) return;
    setCooldown(60);
    setNotice("邮箱验证码发送正在接入（Better Auth 邮箱验证），敬请期待");
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

        {/* 邮箱验证码 */}
        <div>
          <span className="font-serif text-sm font-bold text-ink">
            邮箱验证码
          </span>
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
              onClick={sendCode}
              disabled={cooldown > 0}
              className="shrink-0 border-2 border-ink bg-paper px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50 disabled:hover:bg-paper disabled:hover:text-ink"
            >
              {cooldown > 0 ? `${cooldown}s 后重发` : "发送验证码"}
            </button>
          </div>
        </div>

        <Field
          label="密码"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="至少 8 位"
          required
        />
        <Field
          label="QQ 号（选填）"
          name="qq"
          inputMode="numeric"
          placeholder="纯数字，用于显示头像"
          hint="填 QQ 号即表示同意本站引用你的公开 QQ 头像，用于学员墙和论坛。不想公开可留空，用默认头像"
        />
        <button
          type="submit"
          className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
        >
          创建账号
        </button>
      </form>

      <OrDivider />

      <button
        type="button"
        onClick={pending}
        className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-paper px-6 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <GitHubIcon className="h-5 w-5" /> 用 GitHub 注册
      </button>

      {notice && (
        <p className="mt-5 border-l-4 border-red bg-paper-2 px-3 py-2 font-serif text-sm text-ink-soft">
          {notice}
        </p>
      )}
    </>
  );
}
