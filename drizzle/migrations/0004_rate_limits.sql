CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`namespace` text NOT NULL,
	`key_hash` text NOT NULL,
	`window_started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_namespace_idx` ON `rate_limits` (`namespace`);
--> statement-breakpoint
CREATE INDEX `rate_limits_updated_at_idx` ON `rate_limits` (`updated_at`);
