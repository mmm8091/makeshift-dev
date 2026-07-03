CREATE TABLE `notification_preferences` (
  `user_id` text PRIMARY KEY NOT NULL,
  `daily_digest_enabled` integer DEFAULT 1 NOT NULL,
  `unsubscribed_at` integer,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_digest_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `window_start` integer NOT NULL,
  `window_end` integer NOT NULL,
  `status` text NOT NULL,
  `sent_at` integer,
  `error_code` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  CHECK (`status` IN ('pending', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_digest_deliveries_user_window_unique` ON `daily_digest_deliveries` (`user_id`, `window_start`, `window_end`);
--> statement-breakpoint
CREATE INDEX `daily_digest_deliveries_status_idx` ON `daily_digest_deliveries` (`status`);
