ALTER TABLE `users` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `accounts` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `categories` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `budgets` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `budgets` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `budgets` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `budgets` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `saving_goals` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `saving_goals` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `saving_goals` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `saving_goals` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `merchants` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `merchants` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD COLUMN `sync_error` text;--> statement-breakpoint

ALTER TABLE `transactions` ADD COLUMN `deleted_at` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `sync_status` text NOT NULL DEFAULT 'synced';--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `last_synced_at` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `sync_error` text;--> statement-breakpoint

CREATE TABLE `__new_goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`wallet_id` text,
	`amount` real NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`sync_status` text NOT NULL DEFAULT 'synced',
	`last_synced_at` text,
	`sync_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `saving_goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wallet_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_goal_contributions`(
	`id`,
	`user_id`,
	`goal_id`,
	`wallet_id`,
	`amount`,
	`note`,
	`created_at`,
	`updated_at`,
	`deleted_at`,
	`sync_status`,
	`last_synced_at`,
	`sync_error`
)
SELECT
	`gc`.`id`,
	`sg`.`user_id`,
	`gc`.`goal_id`,
	`gc`.`wallet_id`,
	`gc`.`amount`,
	`gc`.`note`,
	`gc`.`created_at`,
	coalesce(`gc`.`created_at`, `sg`.`updated_at`, `sg`.`created_at`),
	NULL,
	'synced',
	NULL,
	NULL
FROM `goal_contributions` `gc`
JOIN `saving_goals` `sg` ON `sg`.`id` = `gc`.`goal_id`;--> statement-breakpoint
DROP TABLE `goal_contributions`;--> statement-breakpoint
ALTER TABLE `__new_goal_contributions` RENAME TO `goal_contributions`;--> statement-breakpoint
CREATE INDEX `goal_contributions_user_idx` ON `goal_contributions` (`user_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_goal_idx` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_wallet_idx` ON `goal_contributions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_date_idx` ON `goal_contributions` (`created_at`);--> statement-breakpoint

CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload_snapshot` text,
	`attempt_count` integer NOT NULL DEFAULT 0,
	`next_retry_at` text,
	`locked_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `sync_queue_due_idx` ON `sync_queue` (`user_id`, `next_retry_at`, `created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `sync_queue_record_idx` ON `sync_queue` (`user_id`, `table_name`, `record_id`);--> statement-breakpoint

CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`table_name` text NOT NULL,
	`cursor_updated_at` text,
	`cursor_id` text,
	`last_full_sync_at` text,
	`last_success_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `sync_state_table_idx` ON `sync_state` (`user_id`, `table_name`);--> statement-breakpoint

CREATE TABLE `sync_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`user_id` text NOT NULL,
	`locked_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);  
