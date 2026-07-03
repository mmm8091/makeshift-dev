"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  submitCourseFeedback,
  withdrawCourseFeedback,
  type CourseFeedbackWriteResult,
} from "@/lib/course-feedback";
import type { FeedbackStatus } from "@/lib/course-feedback-types";

export type CourseFeedbackFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { status?: string; bodyMd?: string; sectionSlug?: string };
};

export const COURSE_FEEDBACK_IDLE: CourseFeedbackFormState = { ok: false };

async function serviceArgs() {
  const { env } = await getCloudflareContext({ async: true });
  return { env, requestHeaders: await headers() };
}

function toFormState(
  result: Extract<CourseFeedbackWriteResult, { ok: false }>,
): CourseFeedbackFormState {
  return {
    ok: false,
    message: result.message ?? defaultMessage(result.reason),
    fieldErrors: result.fieldErrors,
  };
}

function defaultMessage(reason: "forbidden" | "rate_limited" | "invalid") {
  if (reason === "forbidden") return "需要解锁课程后才能反馈";
  if (reason === "rate_limited") return "操作太快了，缓一下再试";
  return "填写有误，检查一下";
}

export async function submitCourseFeedbackAction(
  _prev: CourseFeedbackFormState,
  formData: FormData,
): Promise<CourseFeedbackFormState> {
  const sectionSlug = String(formData.get("sectionSlug") ?? "");
  const result = await submitCourseFeedback({
    ...(await serviceArgs()),
    input: {
      sectionSlug,
      status: String(formData.get("status") ?? "") as FeedbackStatus,
      bodyMd: String(formData.get("bodyMd") ?? ""),
    },
  });
  if (!result.ok) return toFormState(result);

  revalidatePath(`/courses/${sectionSlug}`);
  if (!result.discussionLinked) {
    return {
      ok: true,
      message: "反馈已保存；课程讨论帖暂时没同步上，管理员之后会处理。",
    };
  }
  return { ok: true, message: "反馈已保存，并同步到本节课程讨论帖。" };
}

export async function withdrawCourseFeedbackAction(args: {
  sectionSlug: string;
}): Promise<CourseFeedbackFormState> {
  const result = await withdrawCourseFeedback({
    ...(await serviceArgs()),
    sectionSlug: args.sectionSlug,
  });
  if (!result.ok) return toFormState(result);

  revalidatePath(`/courses/${args.sectionSlug}`);
  return { ok: true, message: "反馈已撤回。" };
}
