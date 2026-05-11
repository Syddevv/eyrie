CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`logo_uri` text,
	`default_category_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `merchants_user_idx` ON `merchants` (`user_id`);--> statement-breakpoint
CREATE INDEX `merchants_name_idx` ON `merchants` (`name`);--> statement-breakpoint
CREATE INDEX `merchants_default_category_idx` ON `merchants` (`default_category_id`);--> statement-breakpoint

INSERT INTO `merchants`(
	`id`,
	`user_id`,
	`name`,
	`logo_uri`,
	`default_category_id`,
	`created_at`,
	`updated_at`
)
SELECT
	lower(hex(randomblob(12))),
	`t`.`user_id`,
	trim(`t`.`merchant_name`),
	NULL,
	NULL,
	min(`t`.`created_at`),
	max(`t`.`updated_at`)
FROM `transactions` `t`
WHERE
	`t`.`type` = 'expense'
	AND trim(coalesce(`t`.`merchant_name`, '')) <> ''
GROUP BY
	`t`.`user_id`,
	lower(trim(`t`.`merchant_name`)),
	trim(`t`.`merchant_name`);--> statement-breakpoint

CREATE TABLE `merchant_category_history` (
	`merchant_id` text NOT NULL,
	`category_id` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` text NOT NULL,
	PRIMARY KEY(`merchant_id`, `category_id`),
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `merchant_category_history_merchant_idx` ON `merchant_category_history` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `merchant_category_history_category_idx` ON `merchant_category_history` (`category_id`);--> statement-breakpoint
CREATE INDEX `merchant_category_history_last_used_idx` ON `merchant_category_history` (`last_used_at`);--> statement-breakpoint

INSERT INTO `merchant_category_history`(
	`merchant_id`,
	`category_id`,
	`usage_count`,
	`last_used_at`
)
SELECT
	`m`.`id`,
	`t`.`category_id`,
	count(*),
	max(`t`.`transaction_date`)
FROM `transactions` `t`
JOIN `merchants` `m`
	ON `m`.`user_id` = `t`.`user_id`
	AND lower(trim(`m`.`name`)) = lower(trim(`t`.`merchant_name`))
WHERE
	`t`.`type` = 'expense'
	AND trim(coalesce(`t`.`merchant_name`, '')) <> ''
	AND `t`.`category_id` IS NOT NULL
GROUP BY
	`m`.`id`,
	`t`.`category_id`;--> statement-breakpoint

UPDATE `merchants`
SET `default_category_id` = (
	SELECT `mch`.`category_id`
	FROM `merchant_category_history` `mch`
	WHERE `mch`.`merchant_id` = `merchants`.`id`
	ORDER BY `mch`.`usage_count` DESC, `mch`.`last_used_at` DESC
	LIMIT 1
)
WHERE `default_category_id` IS NULL;--> statement-breakpoint

CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`category_id` text,
	`merchant_id` text,
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
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint

INSERT INTO `__new_transactions`(
	`id`,
	`user_id`,
	`type`,
	`amount`,
	`currency_code`,
	`category_id`,
	`merchant_id`,
	`account_id`,
	`transfer_account_id`,
	`merchant_name`,
	`notes`,
	`transaction_date`,
	`created_at`,
	`updated_at`
)
SELECT
	`t`.`id`,
	`t`.`user_id`,
	`t`.`type`,
	`t`.`amount`,
	`t`.`currency_code`,
	`t`.`category_id`,
	(
		SELECT `m`.`id`
		FROM `merchants` `m`
		WHERE
			`m`.`user_id` = `t`.`user_id`
			AND lower(trim(`m`.`name`)) = lower(trim(`t`.`merchant_name`))
		LIMIT 1
	),
	`t`.`account_id`,
	`t`.`transfer_account_id`,
	`t`.`merchant_name`,
	`t`.`notes`,
	`t`.`transaction_date`,
	`t`.`created_at`,
	`t`.`updated_at`
FROM `transactions` `t`;--> statement-breakpoint

DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_account_idx` ON `transactions` (`transfer_account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_merchant_idx` ON `transactions` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);
