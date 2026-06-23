CREATE TABLE `agent_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`scopes` text NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`last_used_at` integer,
	`last_used_ip_hash` text,
	`last_used_user_agent_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_access_tokens_hash_unique` ON `agent_access_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `agent_access_tokens_user_id_idx` ON `agent_access_tokens` (`user_id`);
--> statement-breakpoint
CREATE INDEX `agent_access_tokens_revoked_idx` ON `agent_access_tokens` (`revoked_at`);
--> statement-breakpoint
CREATE INDEX `agent_access_tokens_expires_idx` ON `agent_access_tokens` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `agent_access_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`token_id` text,
	`user_id` text NOT NULL,
	`surface` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text NOT NULL,
	`scope` text,
	`ip_hash` text,
	`user_agent_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `agent_access_tokens`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_access_audit_logs_token_id_idx` ON `agent_access_audit_logs` (`token_id`);
--> statement-breakpoint
CREATE INDEX `agent_access_audit_logs_user_created_idx` ON `agent_access_audit_logs` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `agent_access_audit_logs_surface_created_idx` ON `agent_access_audit_logs` (`surface`,`created_at`);
