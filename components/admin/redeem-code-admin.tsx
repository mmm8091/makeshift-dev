"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GeneratedBatch = {
  batchId: string;
  scope: string;
  maxUses: number;
  expiresAt: string | null;
  codes: string[];
};

type GenerateResponse = Partial<GeneratedBatch> & {
  error?: string;
};

type BatchSummary = {
  batchId: string;
  scope: string;
  codeCount: number;
  maxUses: number;
  usedCount: number;
  disabledCount: number;
  expiresAt: string | null;
  createdAt: string;
};

type BatchListResponse = {
  batches?: BatchSummary[];
  error?: string;
};

const SCOPE_OPTIONS = [
  { value: "course:full", label: "课程通行证" },
  { value: "forum:access", label: "论坛权限" },
  { value: "mcp:read", label: "MCP 读取" },
  { value: "api:read", label: "外部 API 读取" },
];

export function RedeemCodeAdmin() {
  const [notice, setNotice] = useState("");
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [batchNotice, setBatchNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const defaultBatchId = useMemo(
    () => `batch-${new Date().toISOString().slice(0, 10)}`,
    [],
  );

  const loadBatches = async () => {
    setIsLoadingBatches(true);
    setBatchNotice("");
    try {
      const response = await fetch("/api/admin/redeem-codes", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const data = (await response.json().catch(() => ({}))) as BatchListResponse;
      if (!response.ok || !data.batches) {
        setBatchNotice(data.error || "批次列表加载失败");
        return;
      }
      setBatches(data.batches);
    } catch (error) {
      console.error(error);
      setBatchNotice("批次列表请求没有完成");
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const generateCodes = async (formData: FormData) => {
    setIsPending(true);
    setNotice("");
    setCopied(false);

    const payload = {
      count: Number(formData.get("count") || 1),
      scope: String(formData.get("scope") || "course:full"),
      maxUses: Number(formData.get("maxUses") || 1),
      batchId: String(formData.get("batchId") || defaultBatchId),
      expiresAt: String(formData.get("expiresAt") || ""),
    };

    try {
      const response = await fetch("/api/admin/redeem-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as GenerateResponse;

      if (!response.ok || !data.codes || !data.batchId || !data.scope) {
        setNotice(data.error || "卡密生成失败");
        return;
      }

      setBatch({
        batchId: data.batchId,
        scope: data.scope,
        maxUses: data.maxUses || payload.maxUses,
        expiresAt: data.expiresAt || null,
        codes: data.codes,
      });
      setNotice(`已生成 ${data.codes.length} 张卡密`);
      void loadBatches();
    } catch (error) {
      console.error(error);
      setNotice("生成请求没有完成");
    } finally {
      setIsPending(false);
    }
  };

  const copyCodes = async () => {
    if (!batch) return;
    await navigator.clipboard.writeText(batch.codes.join("\n"));
    setCopied(true);
  };

  const disableBatch = async (target: BatchSummary) => {
    const activeCount = target.codeCount - target.disabledCount;
    if (activeCount <= 0) return;
    if (
      !window.confirm(
        `确认禁用批次「${target.batchId}」的 ${activeCount} 张未禁用卡密？已兑换权益不会撤回。`,
      )
    ) {
      return;
    }

    setBatchNotice("");
    try {
      const response = await fetch("/api/admin/redeem-codes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          batchId: target.batchId,
          scope: target.scope,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        disabledCount?: number;
      };
      if (!response.ok) {
        setBatchNotice(data.error || "禁用批次失败");
        return;
      }
      setBatchNotice(`已禁用 ${data.disabledCount ?? 0} 张卡密`);
      void loadBatches();
    } catch (error) {
      console.error(error);
      setBatchNotice("禁用请求没有完成");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">后台</p>
          <h1 className="mt-2 font-display text-4xl font-black">卡密管理</h1>
          <p className="mt-3 font-serif text-base text-ink-soft">
            生成课程兑换卡密，明文只在本页本次结果里出现一次。
          </p>
        </div>
        <Link
          href="/me"
          className="inline-flex border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          返回用户中心
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="print-block p-7">
          <p className="font-serif text-sm font-bold text-red">生成批次</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void generateCodes(new FormData(event.currentTarget));
            }}
            className="mt-5 space-y-5"
          >
            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                数量
              </span>
              <input
                name="count"
                type="number"
                min={1}
                max={200}
                defaultValue={10}
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-ink focus:border-red focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                权限 scope
              </span>
              <input
                name="scope"
                defaultValue="course:full"
                list="redeem-scope-options"
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-sm text-ink focus:border-red focus:outline-none"
              />
              <datalist id="redeem-scope-options">
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
              <span className="mt-1 block font-serif text-xs text-ink-faint">
                `course:full` 是当前通行证；MCP / 外部 API 可用独立 scope 预发。
              </span>
            </label>

            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                每张可用次数
              </span>
              <input
                name="maxUses"
                type="number"
                min={1}
                max={1000}
                defaultValue={1}
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-ink focus:border-red focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                批次名
              </span>
              <input
                name="batchId"
                defaultValue={defaultBatchId}
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-sm text-ink focus:border-red focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-serif text-sm font-bold text-ink">
                过期日期
              </span>
              <input
                name="expiresAt"
                type="date"
                className="mt-1.5 w-full border-2 border-ink bg-paper px-4 py-2.5 font-mono text-ink focus:border-red focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:opacity-50"
            >
              {isPending ? "正在生成" : "生成卡密"}
            </button>
            {notice && (
              <p className="font-serif text-sm text-ink-soft">{notice}</p>
            )}
          </form>
        </section>

        <section className="border-2 border-ink bg-paper-2 p-7 shadow-[6px_6px_0_0_var(--color-ink)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-serif text-sm font-bold text-red">生成结果</p>
              <h2 className="mt-2 font-display text-3xl font-black">
                一次性明文
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void copyCodes()}
              disabled={!batch}
              className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {copied ? "已复制" : "复制全部"}
            </button>
          </div>

          {batch ? (
            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-4">
                <Meta label="批次" value={batch.batchId} />
                <Meta label="权限" value={batch.scope} />
                <Meta label="次数" value={`${batch.maxUses} 次`} />
                <Meta
                  label="过期"
                  value={
                    batch.expiresAt
                      ? new Date(batch.expiresAt).toLocaleDateString("zh-CN")
                      : "不过期"
                  }
                />
              </div>
              <textarea
                readOnly
                value={batch.codes.join("\n")}
                rows={Math.min(Math.max(batch.codes.length, 8), 18)}
                className="mt-5 w-full resize-y border-2 border-ink bg-paper px-4 py-3 font-mono text-sm leading-7 text-ink focus:outline-none"
              />
              <p className="mt-3 font-serif text-sm text-red">
                这批明文刷新后不会再显示。不要提交到仓库，也不要发到公开群。
              </p>
            </div>
          ) : (
            <div className="mt-6 border-2 border-edge bg-paper p-6">
              <p className="font-serif text-sm text-ink-soft">
                还没有生成结果。左边提交后，这里会显示本批卡密。
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-10 border-2 border-ink bg-paper-2 p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-serif text-sm font-bold text-red">批次列表</p>
            <h2 className="mt-2 font-display text-3xl font-black">
              已生成卡密
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadBatches()}
            disabled={isLoadingBatches}
            className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {isLoadingBatches ? "刷新中" : "刷新"}
          </button>
        </div>

        {batchNotice && (
          <p className="mt-4 font-serif text-sm text-ink-soft">{batchNotice}</p>
        )}

        {batches.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse font-serif text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="py-2 pr-4">批次</th>
                  <th className="py-2 pr-4">scope</th>
                  <th className="py-2 pr-4">卡数</th>
                  <th className="py-2 pr-4">使用</th>
                  <th className="py-2 pr-4">状态</th>
                  <th className="py-2 pr-4">过期</th>
                  <th className="py-2 pr-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((item) => {
                  const activeCount = item.codeCount - item.disabledCount;
                  return (
                    <tr
                      key={`${item.batchId}:${item.scope}`}
                      className="border-b-2 border-edge align-top"
                    >
                      <td className="py-3 pr-4 font-mono text-xs">
                        {item.batchId}
                        <span className="mt-1 block font-serif text-xs text-ink-faint">
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{item.scope}</td>
                      <td className="py-3 pr-4">{item.codeCount}</td>
                      <td className="py-3 pr-4">
                        {item.usedCount} / {item.maxUses}
                      </td>
                      <td className="py-3 pr-4">
                        {item.disabledCount > 0
                          ? `已禁用 ${item.disabledCount}`
                          : "可用"}
                      </td>
                      <td className="py-3 pr-4">
                        {item.expiresAt ? formatDate(item.expiresAt) : "不过期"}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void disableBatch(item)}
                          disabled={activeCount <= 0}
                          className="border-2 border-red bg-paper px-3 py-1.5 font-bold text-red transition-colors hover:bg-red hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-paper disabled:hover:text-red"
                        >
                          禁用剩余
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 border-2 border-edge bg-paper p-6">
            <p className="font-serif text-sm text-ink-soft">
              还没有可展示的批次。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-edge bg-paper p-4">
      <p className="font-serif text-xs font-bold text-red">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-ink">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN");
}
