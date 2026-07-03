ALTER TABLE `forum_posts` ADD `last_activity_at` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `forum_posts`
SET `last_activity_at` = COALESCE(
  (
    SELECT MAX(`forum_comments`.`created_at`)
    FROM `forum_comments`
    WHERE `forum_comments`.`post_id` = `forum_posts`.`id`
      AND `forum_comments`.`status` = 'published'
  ),
  `forum_posts`.`created_at`
);
--> statement-breakpoint
CREATE INDEX `forum_posts_last_activity_idx` ON `forum_posts` (`last_activity_at`);
--> statement-breakpoint
CREATE TABLE `forum_comment_votes` (
  `comment_id` text NOT NULL,
  `user_id` text NOT NULL,
  `value` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  PRIMARY KEY(`comment_id`, `user_id`),
  FOREIGN KEY (`comment_id`) REFERENCES `forum_comments`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_comment_votes_user_id_idx` ON `forum_comment_votes` (`user_id`);
--> statement-breakpoint
CREATE TABLE `forum_post_subscriptions` (
  `post_id` text NOT NULL,
  `user_id` text NOT NULL,
  `muted_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  PRIMARY KEY(`post_id`, `user_id`),
  FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_post_subscriptions_user_active_idx` ON `forum_post_subscriptions` (`user_id`, `muted_at`);
