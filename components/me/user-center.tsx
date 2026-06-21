"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QQAvatar } from "@/components/qq-avatar";
import { authClient } from "@/lib/auth-client";

type UserCenterProfile = {
  displayName: string;
  qqNumber: string | null;
  bio: string | null;
  role: "student" | "admin";
};

type UserCenterUser = {
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null | undefined;
};

type UserCenterProps = {
  user: UserCenterUser;
  profile: UserCenterProfile;
  entitlementScopes: string[];
};

/** 提示语带成败语义，决定颜色与读屏播报。 */
type Notice = { kind: "ok" | "error"; text: string } | null;

const BIO_MAX = 160;
const QQ_RE = /^\d{5,12}$/;

/** 已知权益 scope 的人话标签；未知 scope 原样显示。 */
const SCOPE_LABELS: Record<string, string> = {
  "course:full": "全部课程",
};

function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

export function UserCenter({
  user,
  profile: initialProfile,
  entitlementScopes,
}: UserCenterProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  // 表单走受控：QQ 实时预览头像、简介计字、改动才能保存都靠它。
  const [form, setForm] = useState({
    displayName: initialProfile.displayName,
    qqNumber: initialProfile.qqNumber ?? "",
    bio: initialProfile.bio ?? "",
  });
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [redeemNotice, setRedeemNotice] = useState<Notice>(null);
  const [code, setCode] = useState("");
  const [isProfilePending, setIsProfilePending] = useState(false);
  const [isRedeemPending, setIsRedeemPending] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  const trimmedName = form.displayName.trim();
  const trimmedQq = form.qqNumber.trim();
  const nameOk = trimmedName.length >= 1 && trimmedName.length <= 40;
  const qqOk = trimmedQq === "" || QQ_RE.test(trimmedQq);
  const bioOk = form.bio.length <= BIO_MAX;
  const dirty =
    form.displayName !== profile.displayName ||
    form.qqNumber !== (profile.qqNumber ?? "") ||
    form.bio !== (profile.bio ?? "");
  const canSave = dirty && nameOk && qqOk && bioOk && !isProfilePending;
  const showQqPreview = trimmedQq !== "" && qqOk;
  // 提示优先级：错误 > 有未保存改动 > 上次保存结果，避免编辑后还挂着旧的「已保存」。
  const profileStatus: Notice =
    profileNotice?.kind === "error"
      ? profileNotice
      : dirty
        ? { kind: "ok", text: "有未保存的改动" }
        : profileNotice;

  const saveProfile = async () => {
    if (!canSave) return;
    setIsProfilePending(true);
    setProfileNotice(null);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          qqNumber: form.qqNumber,
          bio: form.bio,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: UserCenterProfile;
      };

      if (!response.ok || !data.profile) {
        setProfileNotice({ kind: "error", text: data.error || "资料保存失败" });
        return;
      }

      setProfile(data.profile);
      // 用服务端回写的值（已 trim）对齐表单，清掉「已改动」状态。
      setForm({
        displayName: data.profile.displayName,
        qqNumber: data.profile.qqNumber ?? "",
        bio: data.profile.bio ?? "",
      });
      setProfileNotice({ kind: "ok", text: "资料已保存" });
      router.refresh();
    } catch (error) {
      console.error(error);
      setProfileNotice({ kind: "error", text: "资料保存请求没有完成" });
    } finally {
      setIsProfilePending(false);
    }
  };

  const redeemCode = async () => {
    const trimmed = code.trim();
    if (!trimmed || isRedeemPending) return;
    setIsRedeemPending(true);
    setRedeemNotice(null);

    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        scope?: string;
      };

      if (!response.ok) {
        setRedeemNotice({ kind: "error", text: data.error || "卡密兑换失败" });
        return;
      }

      setCode("");
      setRedeemNotice({
        kind: "ok",
        text: `已解锁：${data.scope ? scopeLabel(data.scope) : "课程权限"}`,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      setRedeemNotice({ kind: "error", text: "兑换请求没有完成" });
    } finally {
      setIsRedeemPending(false);
    }
  };

  const signOut = async () => {
    setIsSignOutPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="print-block p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar user={user} profile={profile} />
              <div>
                <p className="kicker">工作台</p>
                <h1 className="misprint mt-2 font-display text-3xl font-black">
                  {profile.displayName || user.name}
                </h1>
                <p className="mt-1 font-serif text-sm text-ink-soft">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isSignOutPending}
              className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {isSignOutPending ? "正在退出" : "退出登录"}
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatusBlock
              label="邮箱"
              value={user.emailVerified ? "已验证" : "未验证"}
              tone={user.emailVerified ? "ok" : "warn"}
            />
            <StatusBlock
              label="身份"
              value={profile.role === "admin" ? "管理员" : "学员"}
            />
            <StatusBlock
              label="课程权限"
              value={
                entitlementScopes.length > 0
                  ? `${entitlementScopes.length} 项`
                  : "待解锁"
              }
              tone={entitlementScopes.length > 0 ? "gold" : "default"}
            />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
            className="mt-9 space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="font-serif text-sm font-bold text-ink">
                  昵称
                </span>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      displayName: event.target.value,
                    }))
                  }
                  maxLength={40}
                  required
                  className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="font-serif text-sm font-bold text-ink">
                  QQ 号
                </span>
                <div className="mt-1.5 flex items-stretch gap-2">
                  <input
                    name="qqNumber"
                    inputMode="numeric"
                    value={form.qqNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        qqNumber: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    maxLength={12}
                    placeholder="用于头像"
                    aria-invalid={!qqOk}
                    className="w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none aria-[invalid=true]:border-red"
                  />
                  <div
                    className="h-11 w-11 shrink-0 overflow-hidden border-2 border-edge bg-paper-3"
                    aria-hidden
                  >
                    {showQqPreview ? (
                      <QQAvatar
                        qq={trimmedQq}
                        name="头像预览"
                        className="h-full w-full"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-lg font-black text-ink-faint">
                        头
                      </span>
                    )}
                  </div>
                </div>
                <span className="mt-1.5 block font-serif text-xs text-ink-faint">
                  {trimmedQq !== "" && !qqOk
                    ? "QQ 号是 5 到 12 位数字"
                    : "右侧实时预览头像，留空则用 GitHub 头像或昵称首字"}
                </span>
              </label>
            </div>
            <label className="block">
              <span className="flex items-center justify-between font-serif text-sm font-bold text-ink">
                简介
                <span
                  className={`font-serif text-xs font-normal ${
                    form.bio.length > BIO_MAX ? "text-red" : "text-ink-faint"
                  }`}
                >
                  {form.bio.length} / {BIO_MAX}
                </span>
              </span>
              <textarea
                name="bio"
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
                rows={4}
                maxLength={BIO_MAX}
                placeholder="一句话介绍自己，会显示在学员墙和论坛"
                className="mt-1.5 w-full resize-none border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={!canSave}
                className="border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
              >
                {isProfilePending ? "正在保存" : "保存资料"}
              </button>
              <p
                role="status"
                aria-live="polite"
                className={`font-serif text-sm ${
                  profileStatus?.kind === "error" ? "text-red" : "text-ink-soft"
                }`}
              >
                {profileStatus?.text ?? ""}
              </p>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="print-block p-6">
            <p className="kicker">卡密</p>
            <h2 className="mt-2 font-display text-2xl font-black">兑换课程</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void redeemCode();
              }}
              className="mt-5 space-y-4"
            >
              <input
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="CTBZ-..."
                autoComplete="off"
                spellCheck={false}
                className="w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-sm uppercase text-ink placeholder:text-ink-faint placeholder:normal-case focus:border-red focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRedeemPending || code.trim() === ""}
                className="w-full border-2 border-ink bg-ink px-5 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
              >
                {isRedeemPending ? "正在兑换" : "兑换"}
              </button>
              <p
                role="status"
                aria-live="polite"
                className={`min-h-5 font-serif text-sm ${
                  redeemNotice?.kind === "error" ? "text-red" : "text-terminal"
                }`}
              >
                {redeemNotice?.text ?? ""}
              </p>
            </form>
          </section>

          <section className="border-2 border-edge bg-paper-2 p-6">
            <p className="kicker">权益</p>
            <h2 className="mt-2 font-display text-2xl font-black">已解锁</h2>
            <div className="mt-5 space-y-3">
              {entitlementScopes.length > 0 ? (
                entitlementScopes.map((scope) => (
                  <div
                    key={scope}
                    className="flex items-center gap-3 border-2 border-gold bg-paper p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-gold bg-[rgba(215,168,63,0.12)] font-display text-xl font-black text-gold"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-ink">
                        {scopeLabel(scope)}
                      </p>
                      <p className="truncate font-mono text-xs text-ink-faint">
                        {scope}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-serif text-sm text-ink-soft">
                  暂无课程权限，用卡密兑换后在这里查看
                </p>
              )}
            </div>
          </section>

          {profile.role === "admin" && (
            <section className="border-2 border-edge bg-paper-2 p-6">
              <p className="kicker">管理</p>
              <h2 className="mt-2 font-display text-2xl font-black">
                卡密发放
              </h2>
              <p className="mt-3 font-serif text-sm text-ink-soft">
                生成卡密后明文只显示一次，发给学员前先保存到你自己的私密记录里
              </p>
              <Link
                href="/admin/redeem-codes"
                className="mt-5 inline-flex w-full items-center justify-center border-2 border-ink bg-paper px-5 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                进入卡密管理
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Avatar({
  user,
  profile,
}: {
  user: UserCenterUser;
  profile: UserCenterProfile;
}) {
  if (profile.qqNumber) {
    return (
      <div className="h-20 w-20 overflow-hidden border-2 border-ink bg-paper shadow-[4px_4px_0_0_var(--color-ink)]">
        <QQAvatar
          qq={profile.qqNumber}
          name={profile.displayName || user.name}
          className="h-full w-full"
        />
      </div>
    );
  }

  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={profile.displayName || user.name}
        className="h-20 w-20 border-2 border-ink bg-paper object-cover shadow-[4px_4px_0_0_var(--color-ink)]"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center border-2 border-ink bg-paper-3 font-display text-3xl font-black text-ink shadow-[4px_4px_0_0_var(--color-ink)]">
      {(profile.displayName || user.name || "草").slice(0, 1)}
    </div>
  );
}

function StatusBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "gold";
}) {
  const valueTone =
    tone === "ok"
      ? "text-terminal"
      : tone === "warn"
        ? "text-red"
        : tone === "gold"
          ? "text-gold"
          : "text-ink";
  return (
    <div className="border-2 border-edge bg-paper p-4">
      <p className="font-serif text-xs font-bold text-red">{label}</p>
      <p className={`mt-1 font-display text-xl font-black ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}
