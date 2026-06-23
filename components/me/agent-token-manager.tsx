"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AgentAccessScope = "mcp:read" | "mcp:write" | "api:read" | "api:write";

type AgentAccessTokenView = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: AgentAccessScope[];
  expiresAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
};

type CreateResponse = {
  plainToken?: string;
  token?: AgentAccessTokenView;
  error?: string;
};

type AgentTokenManagerProps = {
  initialTokens: AgentAccessTokenView[];
};

type Notice = { kind: "ok" | "error"; text: string } | null;

const MCP_ENDPOINT = "https://makeshift-dev.digitalleft.org/api/mcp";

const SCOPE_OPTIONS: Array<{
  value: AgentAccessScope;
  label: string;
  detail: string;
}> = [
  { value: "mcp:read", label: "读课程和论坛", detail: "mcp:read" },
  { value: "mcp:write", label: "发帖和回帖", detail: "mcp:write" },
  { value: "api:read", label: "外部 API 读取", detail: "api:read" },
  { value: "api:write", label: "外部 API 写入", detail: "api:write" },
];

const DEFAULT_SCOPES: AgentAccessScope[] = ["mcp:read", "mcp:write"];

export function AgentTokenManager({ initialTokens }: AgentTokenManagerProps) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("我的 Agent");
  const [scopes, setScopes] = useState<AgentAccessScope[]>(DEFAULT_SCOPES);
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());
  const [createdToken, setCreatedToken] = useState<{
    plainToken: string;
    token: AgentAccessTokenView;
  } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const activeTokens = useMemo(
    () => tokens.filter((token) => !token.revokedAt),
    [tokens],
  );
  const revokedTokens = useMemo(
    () => tokens.filter((token) => token.revokedAt),
    [tokens],
  );
  const canCreate = name.trim().length > 0 && scopes.length > 0 && !isCreating;

  const toggleScope = (scope: AgentAccessScope) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((item) => item !== scope)
        : [...prev, scope],
    );
  };

  const createToken = async () => {
    if (!canCreate) return;
    setIsCreating(true);
    setNotice(null);
    setCopied(null);

    try {
      const response = await fetch("/api/me/agent-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          scopes,
          expiresAt: expiresAt || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as CreateResponse;

      if (!response.ok || !data.plainToken || !data.token) {
        setNotice({ kind: "error", text: data.error || "令牌创建失败" });
        return;
      }

      setCreatedToken({ plainToken: data.plainToken, token: data.token });
      setTokens((prev) => [data.token!, ...prev]);
      setNotice({ kind: "ok", text: "令牌已生成" });
      setName("我的 Agent");
      setScopes(DEFAULT_SCOPES);
      setExpiresAt(defaultExpiresAt());
      router.refresh();
    } catch (error) {
      console.error(error);
      setNotice({ kind: "error", text: "令牌创建请求没有完成" });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    if (revokingId) return;
    setRevokingId(tokenId);
    setNotice(null);

    try {
      const response = await fetch("/api/me/agent-tokens", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke", tokenId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setNotice({ kind: "error", text: data.error || "撤销失败" });
        return;
      }

      setTokens((prev) =>
        prev.map((token) =>
          token.id === tokenId ? { ...token, revokedAt: Date.now() } : token,
        ),
      );
      setNotice({ kind: "ok", text: data.ok ? "令牌已撤销" : "令牌已不可用" });
      router.refresh();
    } catch (error) {
      console.error(error);
      setNotice({ kind: "error", text: "撤销请求没有完成" });
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">Agent 通行证</p>
          <h1 className="misprint mt-2 font-display text-3xl font-black sm:text-4xl">
            访问令牌
          </h1>
        </div>
        <div className="border-2 border-edge bg-paper-2 px-4 py-3 font-mono text-xs text-ink-soft">
          {MCP_ENDPOINT}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="print-block p-6 sm:p-7">
          <h2 className="font-display text-2xl font-black">新建令牌</h2>
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createToken();
            }}
          >
            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">名称</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none"
              />
            </label>

            <fieldset>
              <legend className="font-serif text-sm font-bold text-ink">
                权限
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {SCOPE_OPTIONS.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors ${
                      scopes.includes(scope.value)
                        ? "border-ink bg-paper"
                        : "border-edge bg-paper-2 hover:border-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 h-4 w-4 accent-red"
                    />
                    <span className="min-w-0">
                      <span className="block font-display font-bold text-ink">
                        {scope.label}
                      </span>
                      <span className="block truncate font-mono text-xs text-ink-faint">
                        {scope.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                过期时间
              </span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-sm text-ink focus:border-red focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={!canCreate}
                className="border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink disabled:hover:bg-ink"
              >
                {isCreating ? "正在生成" : "生成令牌"}
              </button>
              <p
                role="status"
                aria-live="polite"
                className={`min-h-5 font-serif text-sm ${
                  notice?.kind === "error" ? "text-red" : "text-terminal"
                }`}
              >
                {notice?.text ?? ""}
              </p>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="border-2 border-ink bg-paper-2 p-6 shadow-[6px_6px_0_0_var(--color-red)]">
            <p className="kicker">只显示一次</p>
            <h2 className="mt-2 font-display text-2xl font-black">新令牌</h2>
            {createdToken ? (
              <div className="mt-5 space-y-4">
                <textarea
                  readOnly
                  value={createdToken.plainToken}
                  rows={4}
                  className="w-full resize-none border-2 border-ink bg-paper px-3 py-3 font-mono text-xs leading-relaxed text-ink focus:outline-none"
                />
                <CopyButton
                  copied={copied === "plain"}
                  onClick={() => void copyText("plain", createdToken.plainToken)}
                />
                <dl className="grid grid-cols-2 gap-3 font-serif text-sm">
                  <Meta label="前缀" value={createdToken.token.tokenPrefix} />
                  <Meta
                    label="过期"
                    value={formatDate(createdToken.token.expiresAt)}
                  />
                </dl>
              </div>
            ) : (
              <div className="mt-5 border-2 border-dashed border-edge bg-paper p-5 font-serif text-sm text-ink-soft">
                生成后在这里复制
              </div>
            )}
          </section>

          <section className="border-2 border-edge bg-paper-2 p-6">
            <p className="kicker">配置</p>
            <h2 className="mt-2 font-display text-2xl font-black">MCP</h2>
            <div className="mt-5 space-y-3">
              <CopyField
                label="地址"
                value={MCP_ENDPOINT}
                copied={copied === "endpoint"}
                onCopy={() => void copyText("endpoint", MCP_ENDPOINT)}
              />
              <CopyField
                label="Header"
                value="Authorization: Bearer <token>"
                copied={copied === "header"}
                onCopy={() =>
                  void copyText("header", "Authorization: Bearer <token>")
                }
              />
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-10 border-2 border-ink bg-paper-2 p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">当前</p>
            <h2 className="mt-2 font-display text-2xl font-black">令牌列表</h2>
          </div>
          <p className="font-serif text-sm text-ink-soft">
            可用 {activeTokens.length} 个，已撤销 {revokedTokens.length} 个
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {tokens.length === 0 ? (
            <div className="border-2 border-dashed border-edge bg-paper p-5 font-serif text-sm text-ink-soft">
              还没有令牌
            </div>
          ) : (
            tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                isRevoking={revokingId === token.id}
                onRevoke={() => void revokeToken(token.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TokenRow({
  token,
  isRevoking,
  onRevoke,
}: {
  token: AgentAccessTokenView;
  isRevoking: boolean;
  onRevoke: () => void;
}) {
  const revoked = token.revokedAt !== null;
  const expired = token.expiresAt !== null && token.expiresAt <= Date.now();
  const unavailable = revoked || expired;

  return (
    <article
      className={`grid gap-4 border-2 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        unavailable ? "border-edge bg-paper" : "border-ink bg-paper"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-black">{token.name}</h3>
          <span
            className={`border px-2 py-0.5 font-serif text-xs font-bold ${
              unavailable
                ? "border-edge text-ink-faint"
                : "border-terminal text-terminal"
            }`}
          >
            {revoked ? "已撤销" : expired ? "已过期" : "可用"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {token.scopes.map((scope) => (
            <span
              key={scope}
              className="border border-edge bg-paper-2 px-2 py-0.5 font-mono text-xs text-ink-soft"
            >
              {scope}
            </span>
          ))}
        </div>
        <dl className="mt-3 grid gap-2 font-serif text-xs text-ink-soft sm:grid-cols-4">
          <Meta label="前缀" value={token.tokenPrefix} />
          <Meta label="创建" value={formatDate(token.createdAt)} />
          <Meta label="过期" value={formatDate(token.expiresAt)} />
          <Meta label="最近使用" value={formatDate(token.lastUsedAt)} />
        </dl>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={unavailable || isRevoking}
        className="h-11 border-2 border-ink bg-paper px-4 font-bold text-ink transition-colors hover:bg-red hover:text-paper disabled:cursor-not-allowed disabled:border-edge disabled:text-ink-faint disabled:hover:bg-paper"
      >
        {isRevoking ? "撤销中" : "撤销"}
      </button>
    </article>
  );
}

function CopyField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="border-2 border-edge bg-paper p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-serif text-xs font-bold text-red">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="border border-ink px-2 py-1 font-serif text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <code className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-ink-soft">
        {value}
      </code>
    </div>
  );
}

function CopyButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border-2 border-ink bg-ink px-5 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red"
    >
      {copied ? "已复制" : "复制令牌"}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="truncate font-mono text-xs text-ink">{value}</dd>
    </div>
  );
}

function formatDate(value: number | null): string {
  if (!value) return "无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function defaultExpiresAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
