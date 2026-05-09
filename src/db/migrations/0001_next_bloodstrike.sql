PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`account_number_last4` text,
	`color` text,
	`icon` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "user_id", "type", "name", "balance", "currency_code", "account_number_last4", "color", "icon", "is_hidden", "created_at", "updated_at") SELECT "id", "user_id", "type", "name", "balance", "currency_code", "account_number_last4", "color", "icon", "is_hidden", "created_at", "updated_at" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `accounts_type_idx` ON `accounts` (`type`);--> statement-breakpoint
CREATE TABLE `__new_exchange_rates` (
	`base_currency` text NOT NULL,
	`target_currency` text NOT NULL,
	`rate` real NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`base_currency`, `target_currency`),
	FOREIGN KEY (`base_currency`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_currency`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_exchange_rates`("base_currency", "target_currency", "rate", "updated_at") SELECT "base_currency", "target_currency", "rate", "updated_at" FROM `exchange_rates`;--> statement-breakpoint
DROP TABLE `exchange_rates`;--> statement-breakpoint
ALTER TABLE `__new_exchange_rates` RENAME TO `exchange_rates`;--> statement-breakpoint
CREATE INDEX `exchange_rates_base_idx` ON `exchange_rates` (`base_currency`);--> statement-breakpoint
CREATE INDEX `exchange_rates_target_idx` ON `exchange_rates` (`target_currency`);--> statement-breakpoint
CREATE TABLE `__new_goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency_code` text NOT NULL,
	`contribution_date` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_goal_contributions`("id", "goal_id", "account_id", "amount", "currency_code", "contribution_date", "note", "created_at") SELECT "id", "goal_id", "account_id", "amount", "currency_code", "contribution_date", "note", "created_at" FROM `goal_contributions`;--> statement-breakpoint
DROP TABLE `goal_contributions`;--> statement-breakpoint
ALTER TABLE `__new_goal_contributions` RENAME TO `goal_contributions`;--> statement-breakpoint
CREATE INDEX `goal_contributions_goal_idx` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_account_idx` ON `goal_contributions` (`account_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_date_idx` ON `goal_contributions` (`contribution_date`);--> statement-breakpoint
CREATE TABLE `__new_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`currency_code` text NOT NULL,
	`icon` text,
	`color` text,
	`target_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_goals`("id", "user_id", "name", "target_amount", "current_amount", "currency_code", "icon", "color", "target_date", "created_at", "updated_at") SELECT "id", "user_id", "name", "target_amount", "current_amount", "currency_code", "icon", "color", "target_date", "created_at", "updated_at" FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;--> statement-breakpoint
CREATE INDEX `goals_user_idx` ON `goals` (`user_id`);--> statement-breakpoint
CREATE INDEX `goals_target_date_idx` ON `goals` (`target_date`);--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`category_id` text,
	`account_id` text NOT NULL,
	`transfer_account_id` text,
	`merchant_name` text,
	`notes` text,
	`transaction_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "user_id", "type", "amount", "currency_code", "category_id", "account_id", "transfer_account_id", "merchant_name", "notes", "transaction_date", "created_at", "updated_at") SELECT "id", "user_id", "type", "amount", "currency_code", "category_id", "account_id", "transfer_account_id", "merchant_name", "notes", "transaction_date", "created_at", "updated_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_account_idx` ON `transactions` (`transfer_account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text,
	`email` text,
	`avatar_url` text,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "full_name", "email", "avatar_url", "currency_code", "created_at", "updated_at") SELECT "id", "full_name", "email", "avatar_url", "currency_code", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;