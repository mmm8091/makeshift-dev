CREATE TABLE `course_discussion_threads` (
  `section_slug` text PRIMARY KEY NOT NULL,
  `forum_post_id` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`forum_post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_discussion_threads_post_unique` ON `course_discussion_threads` (`forum_post_id`);
--> statement-breakpoint
CREATE TABLE `course_feedback` (
  `id` text PRIMARY KEY NOT NULL,
  `section_slug` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text NOT NULL,
  `body_md` text NOT NULL,
  `forum_post_id` text,
  `forum_comment_id` text,
  `withdrawn_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`forum_post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`forum_comment_id`) REFERENCES `forum_comments`(`id`) ON UPDATE no action ON DELETE set null,
  CHECK (`status` IN ('smooth', 'confusing', 'blocked')),
  CHECK (length(trim(`body_md`)) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_feedback_section_user_unique` ON `course_feedback` (`section_slug`, `user_id`);
--> statement-breakpoint
CREATE INDEX `course_feedback_section_status_idx` ON `course_feedback` (`section_slug`, `status`, `withdrawn_at`);
--> statement-breakpoint
CREATE INDEX `course_feedback_forum_comment_idx` ON `course_feedback` (`forum_comment_id`);
--> statement-breakpoint
CREATE INDEX `course_feedback_updated_idx` ON `course_feedback` (`updated_at`);
