"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addComment,
  createPost,
  editComment,
  editPost,
  moderatePost,
  type ModerationAction,
  type WriteResult,
} from "@/lib/forum";

/**
 * 论坛写操作的 Server Action（规格 §2：写走 Server Action）。
 * 鉴权 / 校验 / 限流都在 `lib/forum.ts`；这里只做参数搬运、跳转与错误回显。
 */

export type ForumFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { title?: string; bodyMd?: string; tagSlugs?: string };
};

const IDLE: ForumFormState = { ok: false };

async function serviceArgs() {
  const { env } = await getCloudflareContext({ async: true });
  return { env, requestHeaders: await headers() };
}

/** 把服务层 WriteResult 的失败映射成表单状态。 */
function toFormState(result: Extract<WriteResult, { ok: false }>): ForumFormState {
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

export async function createPostAction(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const input = {
    title: String(formData.get("title") ?? ""),
    bodyMd: String(formData.get("bodyMd") ?? ""),
    tagSlugs: formData.getAll("tags").map(String),
  };
  const result = await createPost({ ...(await serviceArgs()), input });
  if (!result.ok) return toFormState(result);

  redirect(`/forum/t/${result.slug}`);
}

export async function editPostAction(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const patch = {
    title: String(formData.get("title") ?? ""),
    bodyMd: String(formData.get("bodyMd") ?? ""),
    tagSlugs: formData.getAll("tags").map(String),
  };
  const result = await editPost({ ...(await serviceArgs()), postId, patch });
  if (!result.ok) return toFormState(result);

  redirect(`/forum/t/${slug}`);
}

export async function addCommentAction(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const bodyMd = String(formData.get("bodyMd") ?? "");
  const result = await addComment({ ...(await serviceArgs()), postId, bodyMd });
  if (!result.ok) return toFormState(result);

  revalidatePath(`/forum/t/${slug}`);
  return { ok: true };
}

export async function editCommentAction(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const commentId = String(formData.get("commentId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const bodyMd = String(formData.get("bodyMd") ?? "");
  const result = await editComment({ ...(await serviceArgs()), commentId, bodyMd });
  if (!result.ok) return toFormState(result);

  revalidatePath(`/forum/t/${slug}`);
  return { ok: true };
}

/** 管理操作走直传参数（客户端 useTransition 调用），非表单。 */
export async function moderatePostAction(args: {
  postId: string;
  slug: string;
  action: ModerationAction;
}): Promise<ForumFormState> {
  const result = await moderatePost({
    ...(await serviceArgs()),
    postId: args.postId,
    action: args.action,
  });
  if (!result.ok) return toFormState(result);

  if (args.action === "delete") {
    revalidatePath("/forum");
    redirect("/forum");
  }
  revalidatePath(`/forum/t/${args.slug}`);
  revalidatePath("/forum");
  return { ok: true };
}

export { IDLE as FORUM_FORM_IDLE };
