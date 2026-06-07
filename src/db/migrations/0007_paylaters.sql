CREATE TABLE IF NOT EXISTS `paylaters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`item_name` text NOT NULL,
	`total_amount` real NOT NULL,
	`remaining_balance` real NOT NULL,
	`installment_amount` real NOT NULL,
	`due_day` text,
	`due_date` text,
	`installment_count` real,
	`start_date` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`sync_status` text NOT NULL DEFAULT 'pending',
	`last_synced_at` text,
	`sync_error` text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paylaters_user_updated_idx` ON `paylaters` (`user_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paylaters_status_idx` ON `paylaters` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `paylater_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`paylater_id` text NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` text,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`sync_status` text NOT NULL DEFAULT 'pending',
	`last_synced_at` text,
	`sync_error` text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paylater_payments_user_updated_idx` ON `paylater_payments` (`user_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paylater_payments_paylater_idx` ON `paylater_payments` (`paylater_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paylater_payments_transaction_idx` ON `paylater_payments` (`transaction_id`);
