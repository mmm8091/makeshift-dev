export type ForumFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { title?: string; bodyMd?: string; tagSlugs?: string };
};

export const FORUM_FORM_IDLE: ForumFormState = { ok: false };
