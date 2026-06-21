"use client";

import { useState } from "react";
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

export function UserCenter({
  user,
  profile: initialProfile,
  entitlementScopes,
}: UserCenterProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [profileNotice, setProfileNotice] = useState("");
  const [redeemNotice, setRedeemNotice] = useState("");
  const [isProfilePending, setIsProfilePending] = useState(false);
  const [isRedeemPending, setIsRedeemPending] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  const saveProfile = async (formData: FormData) => {
    setIsProfilePending(true);
    setProfileNotice("");

    const payload = {
      displayName: String(formData.get("displayName") || ""),
      qqNumber: String(formData.get("qqNumber") || ""),
      bio: String(formData.get("bio") || ""),
    };

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: UserCenterProfile;
      };

      if (!response.ok || !data.profile) {
        setProfileNotice(data.error || "资料保存失败");
        return;
      }

      setProfile(data.profile);
      setProfileNotice("资料已保存");
      router.refresh();
    } catch (error) {
      console.error(error);
      setProfileNotice("资料保存请求没有完成");
    } finally {
      setIsProfilePending(false);
    }
  };

  const redeemCode = async (formData: FormData) => {
    setIsRedeemPending(true);
    setRedeemNotice("");

    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: String(formData.get("code") || "") }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        scope?: string;
      };

      if (!response.ok) {
        setRedeemNotice(data.error || "卡密兑换失败");
        return;
      }

      setRedeemNotice(`已解锁：${data.scope || "课程权限"}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setRedeemNotice("兑换请求没有完成");
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
                <h1 className="mt-2 font-display text-3xl font-black">
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
            <StatusBlock label="邮箱" value={user.emailVerified ? "已验证" : "未验证"} />
            <StatusBlock label="身份" value={profile.role === "admin" ? "管理员" : "学员"} />
            <StatusBlock
              label="课程权限"
              value={entitlementScopes.length > 0 ? `${entitlementScopes.length} 项` : "待解锁"}
            />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile(new FormData(event.currentTarget));
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
                  defaultValue={profile.displayName}
                  required
                  className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="font-serif text-sm font-bold text-ink">
                  QQ 号
                </span>
                <input
                  name="qqNumber"
                  inputMode="numeric"
                  defaultValue={profile.qqNumber || ""}
                  placeholder="用于头像"
                  className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                简介
              </span>
              <textarea
                name="bio"
                defaultValue={profile.bio || ""}
                rows={4}
                maxLength={160}
                className="mt-1.5 w-full resize-none border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isProfilePending}
                className="border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:opacity-50"
              >
                {isProfilePending ? "正在保存" : "保存资料"}
              </button>
              {profileNotice && (
                <p className="font-serif text-sm text-ink-soft">
                  {profileNotice}
                </p>
              )}
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="border-2 border-ink bg-paper-2 p-6 shadow-[5px_5px_0_0_var(--color-ink)]">
            <p className="kicker">卡密</p>
            <h2 className="mt-2 font-display text-2xl font-black">兑换课程</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void redeemCode(new FormData(event.currentTarget));
              }}
              className="mt-5 space-y-4"
            >
              <input
                name="code"
                placeholder="CTBZ-..."
                className="w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRedeemPending}
                className="w-full border-2 border-ink bg-ink px-5 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:opacity-50"
              >
                {isRedeemPending ? "正在兑换" : "兑换"}
              </button>
              {redeemNotice && (
                <p className="font-serif text-sm text-ink-soft">
                  {redeemNotice}
                </p>
              )}
            </form>
          </section>

          <section className="border-2 border-edge bg-paper-2 p-6">
            <p className="font-serif text-sm font-bold text-red">已解锁</p>
            <div className="mt-3 space-y-2">
              {entitlementScopes.length > 0 ? (
                entitlementScopes.map((scope) => (
                  <p key={scope} className="font-mono text-sm text-ink">
                    {scope}
                  </p>
                ))
              ) : (
                <p className="font-serif text-sm text-ink-soft">暂无课程权限</p>
              )}
            </div>
          </section>
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
      <div className="h-20 w-20 overflow-hidden border-2 border-ink bg-paper">
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
        className="h-20 w-20 border-2 border-ink bg-paper object-cover"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center border-2 border-ink bg-paper-3 font-display text-3xl font-black text-ink">
      {(profile.displayName || user.name || "草").slice(0, 1)}
    </div>
  );
}

function StatusBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-edge bg-paper p-4">
      <p className="font-serif text-xs font-bold text-red">{label}</p>
      <p className="mt-1 font-display text-xl font-black text-ink">{value}</p>
    </div>
  );
}
