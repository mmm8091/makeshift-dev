"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createForumTagAction,
  renameForumTagAction,
  setForumTagHiddenAction,
  type ForumTagAdminActionState,
} from "@/app/admin/forum-tags/actions";
import type { ForumTagAdmin } from "@/lib/forum-types";

type Props = {
  tags: ForumTagAdmin[];
};

const IDLE: ForumTagAdminActionState = { ok: false, message: "" };
const SLUG_RE = /^[a-z0-9-]+$/;

const fieldClass =
  "w-full border-2 border-ink bg-paper px-4 py-2.5 font-serif text-ink placeholder:text-ink-faint focus:border-red focus:outline-none aria-[invalid=true]:border-red";

function slugFromName(name: string) {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function ForumTagAdminPanel({ tags }: Props) {
  const [isPending, startTransition] = useTransition();
  const [createState, setCreateState] = useState(IDLE);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [notice, setNotice] = useState("");

  const visibleCount = useMemo(
    () => tags.filter((tag) => !tag.hidden).length,
    [tags],
  );
  const hiddenCount = tags.length - visibleCount;
  const slugOk = slug.trim().length > 0 && SLUG_RE.test(slug.trim());
  const nameOk = name.trim().length > 0 && name.trim().length <= 40;
  const canCreate = nameOk && slugOk && !isPending;

  function updateName(nextName: string) {
    setName(nextName);
    if (!manualSlug) setSlug(slugFromName(nextName));
  }

  function createTag() {
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createForumTagAction({ name, slug });
      setCreateState(result);
      setNotice(result.ok ? "标签已创建" : "");
      if (result.ok) {
        setName("");
        setSlug("");
        setManualSlug(false);
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="print-block p-7">
        <p className="font-serif text-sm font-bold text-red">新增标签</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createTag();
          }}
          className="mt-5 space-y-5"
        >
          <label className="block">
            <span className="font-serif text-sm font-bold text-ink">显示名</span>
            <input
              name="name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              aria-invalid={Boolean(createState.fieldErrors?.name)}
              placeholder="例如：作品展示"
              className={`mt-1.5 ${fieldClass}`}
            />
            {createState.fieldErrors?.name && (
              <span className="mt-1 block font-serif text-xs text-red">
                {createState.fieldErrors.name}
              </span>
            )}
          </label>

          <label className="block">
            <span className="font-serif text-sm font-bold text-ink">slug</span>
            <input
              name="slug"
              value={slug}
              onChange={(event) => {
                setManualSlug(true);
                setSlug(event.target.value.toLowerCase());
              }}
              aria-invalid={Boolean(createState.fieldErrors?.slug)}
              placeholder="showcase"
              className={`mt-1.5 font-mono ${fieldClass}`}
            />
            <span className="mt-1 block font-serif text-xs text-ink-faint">
              只用小写字母、数字和连字符；创建后不改 slug
            </span>
            {createState.fieldErrors?.slug && (
              <span className="mt-1 block font-serif text-xs text-red">
                {createState.fieldErrors.slug}
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={!canCreate}
            className="w-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper transition-colors hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "正在创建" : "创建标签"}
          </button>
          <p
            role="status"
            aria-live="polite"
            className={`min-h-5 font-serif text-sm ${
              createState.ok ? "text-terminal" : "text-red"
            }`}
          >
            {createState.message}
          </p>
        </form>
      </section>

      <section className="border-2 border-ink bg-paper-2 p-7 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-sm font-bold text-red">标签列表</p>
            <h2 className="mt-2 font-display text-3xl font-black">
              {visibleCount} 个可用
            </h2>
            <p className="mt-2 font-serif text-sm text-ink-soft">
              {hiddenCount > 0 ? `${hiddenCount} 个已隐藏` : "暂无隐藏标签"}
            </p>
          </div>
          {notice && (
            <p className="border-2 border-edge bg-paper px-3 py-2 font-serif text-sm text-terminal">
              {notice}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {tags.map((tag) => (
            <ForumTagRow
              key={tag.id}
              tag={tag}
              onNotice={setNotice}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ForumTagRow({
  tag,
  onNotice,
}: {
  tag: ForumTagAdmin;
  onNotice: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(tag.name);
  const [state, setState] = useState<ForumTagAdminActionState>(IDLE);
  const dirty = name.trim() !== tag.name;
  const canSave = dirty && name.trim().length > 0 && name.trim().length <= 40 && !isPending;

  function saveName() {
    if (!canSave) return;
    startTransition(async () => {
      const result = await renameForumTagAction({ tagId: tag.id, name });
      setState(result);
      onNotice(result.ok ? `已更新「${name.trim()}」` : "");
    });
  }

  function toggleHidden() {
    startTransition(async () => {
      const result = await setForumTagHiddenAction({
        tagId: tag.id,
        hidden: !tag.hidden,
      });
      setState(result);
      onNotice(
        result.ok
          ? tag.hidden
            ? `已恢复「${tag.name}」`
            : `已隐藏「${tag.name}」`
          : "",
      );
    });
  }

  return (
    <div
      className={`border-2 bg-paper p-4 ${
        tag.hidden ? "border-edge opacity-70" : "border-ink"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border-2 px-2 py-0.5 font-serif text-xs font-bold ${
                tag.hidden
                  ? "border-edge text-ink-faint"
                  : "border-terminal text-terminal"
              }`}
            >
              {tag.hidden ? "已隐藏" : "可用"}
            </span>
            <code className="break-all font-mono text-sm text-ink-soft">
              {tag.slug}
            </code>
            <span className="font-serif text-xs text-ink-faint">
              {tag.postCount} 帖
            </span>
          </div>

          <label className="mt-3 block">
            <span className="sr-only">标签名</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className={`${fieldClass} max-w-md`}
            />
          </label>
          {(state.fieldErrors?.name || (!state.ok && state.message)) && (
            <p className="mt-1 font-serif text-xs text-red">
              {state.fieldErrors?.name ?? state.message}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={saveName}
            disabled={!canSave}
            className="border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={toggleHidden}
            disabled={isPending}
            className={`border-2 px-4 py-2 font-bold transition-colors disabled:opacity-50 ${
              tag.hidden
                ? "border-terminal bg-paper text-terminal hover:bg-terminal hover:text-paper"
                : "border-red bg-paper text-red hover:bg-red hover:text-paper"
            }`}
          >
            {tag.hidden ? "恢复" : "隐藏"}
          </button>
        </div>
      </div>
    </div>
  );
}
