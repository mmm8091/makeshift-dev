"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createForumTag,
  renameForumTag,
  setForumTagHidden,
  type ForumTagWriteResult,
} from "@/lib/forum";

export type ForumTagAdminActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: { name?: string; slug?: string };
};

async function serviceArgs() {
  const { env } = await getCloudflareContext({ async: true });
  return { env, requestHeaders: await headers() };
}

function toState(result: ForumTagWriteResult): ForumTagAdminActionState {
  if (result.ok) return { ok: true, message: "已保存" };
  return {
    ok: false,
    message: result.message ?? defaultMessage(result.reason),
    fieldErrors: result.fieldErrors,
  };
}

function defaultMessage(reason: "forbidden" | "rate_limited" | "invalid"): string {
  if (reason === "forbidden") return "没有权限";
  if (reason === "rate_limited") return "操作太快了，缓一下再试";
  return "填写有误，检查一下";
}

function revalidateForumTags() {
  revalidatePath("/admin/forum-tags");
  revalidatePath("/forum");
}

export async function createForumTagAction(input: {
  name: string;
  slug: string;
}): Promise<ForumTagAdminActionState> {
  const result = await createForumTag({ ...(await serviceArgs()), input });
  if (result.ok) revalidateForumTags();
  return toState(result);
}

export async function renameForumTagAction(input: {
  tagId: string;
  name: string;
}): Promise<ForumTagAdminActionState> {
  const result = await renameForumTag({
    ...(await serviceArgs()),
    tagId: input.tagId,
    name: input.name,
  });
  if (result.ok) revalidateForumTags();
  return toState(result);
}

export async function setForumTagHiddenAction(input: {
  tagId: string;
  hidden: boolean;
}): Promise<ForumTagAdminActionState> {
  const result = await setForumTagHidden({
    ...(await serviceArgs()),
    tagId: input.tagId,
    hidden: input.hidden,
  });
  if (result.ok) revalidateForumTags();
  return toState(result);
}
