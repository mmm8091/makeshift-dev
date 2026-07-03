import type { Author } from "@/lib/forum-types";

export const FEEDBACK_BODY_MAX = 4000;

export const FEEDBACK_STATUSES = ["smooth", "confusing", "blocked"] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  smooth: "✅ 顺利",
  confusing: "🤔 内容难懂",
  blocked: "🐛 操作卡住",
};

export type CourseFeedbackView = {
  id: string;
  sectionSlug: string;
  status: FeedbackStatus;
  bodyMd: string;
  forumCommentId: string | null;
  withdrawnAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CourseDiscussionComment = {
  id: string;
  author: Author;
  bodyMd: string;
  createdAt: number;
  updatedAt: number;
  likeCount: number;
  isViewerFeedback: boolean;
};

export type CourseFeedbackSummary = {
  sectionSlug: string;
  counts: Record<FeedbackStatus, number>;
  total: number;
  viewerFeedback: CourseFeedbackView | null;
  discussionPostSlug: string | null;
  highlightedComments: CourseDiscussionComment[];
};

export type CourseFeedbackInput = {
  sectionSlug: string;
  status: FeedbackStatus;
  bodyMd: string;
};

export type CourseFeedbackFieldErrors = {
  status?: string;
  bodyMd?: string;
  sectionSlug?: string;
};

export type CourseFeedbackWriteResult<T = Record<never, never>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      reason: "forbidden" | "rate_limited" | "invalid";
      message?: string;
      fieldErrors?: CourseFeedbackFieldErrors;
    };

export type AdminCourseFeedbackOverview = {
  sectionSlug: string;
  title: string;
  orderIndex: number;
  counts: Record<FeedbackStatus, number>;
  total: number;
  latestFeedbackAt: number | null;
};

export type AdminCourseFeedbackItem = CourseFeedbackView & {
  author: Author;
};

export function isFeedbackStatus(value: string): value is FeedbackStatus {
  return (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

export function formatCourseFeedbackForumBody(
  status: FeedbackStatus,
  bodyMd: string,
): string {
  return `${FEEDBACK_STATUS_LABELS[status]}\n\n${bodyMd.trim()}`;
}
