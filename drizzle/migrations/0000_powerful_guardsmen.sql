CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_unique` ON `account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `course_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `course_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `course_assets_section_id_idx` ON `course_assets` (`section_id`);--> statement-breakpoint
CREATE TABLE `course_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body_md` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'locked' NOT NULL,
	`required_entitlement` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_sections_slug_unique` ON `course_sections` (`slug`);--> statement-breakpoint
CREATE INDEX `course_sections_status_visibility_idx` ON `course_sections` (`status`,`visibility`);--> statement-breakpoint
CREATE INDEX `course_sections_order_idx` ON `course_sections` (`order_index`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text,
	`starts_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entitlements_user_scope_unique` ON `entitlements` (`user_id`,`scope`);--> statement-breakpoint
CREATE INDEX `entitlements_user_id_idx` ON `entitlements` (`user_id`);--> statement-breakpoint
CREATE TABLE `forum_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body_md` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_comments_post_id_idx` ON `forum_comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `forum_comments_author_id_idx` ON `forum_comments` (`author_id`);--> statement-breakpoint
CREATE TABLE `forum_post_tags` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `forum_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_post_tags_tag_id_idx` ON `forum_post_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `forum_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`body_md` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`pinned_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_posts_slug_unique` ON `forum_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `forum_posts_author_id_idx` ON `forum_posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `forum_posts_status_pinned_idx` ON `forum_posts` (`status`,`pinned_at`);--> statement-breakpoint
CREATE TABLE `forum_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_tags_slug_unique` ON `forum_tags` (`slug`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`github_username` text,
	`qq_number` text,
	`bio` text,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `redeem_code_uses` (
	`id` text PRIMARY KEY NOT NULL,
	`redeem_code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`used_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_hash` text,
	`user_agent_hash` text,
	FOREIGN KEY (`redeem_code_id`) REFERENCES `redeem_codes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `redeem_code_uses_code_id_idx` ON `redeem_code_uses` (`redeem_code_id`);--> statement-breakpoint
CREATE INDEX `redeem_code_uses_user_id_idx` ON `redeem_code_uses` (`user_id`);--> statement-breakpoint
CREATE TABLE `redeem_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`batch_id` text,
	`entitlement_scope` text NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`disabled_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redeem_codes_code_hash_unique` ON `redeem_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `redeem_codes_batch_id_idx` ON `redeem_codes` (`batch_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000),
	`updatedAt` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);