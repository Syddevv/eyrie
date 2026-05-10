CREATE TABLE `saving_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`target_date` text NOT NULL,
	`icon_type` text DEFAULT 'vector' NOT NULL,
	`icon_name` text,
	`icon_image_uri` text,
	`emoji` text,
	`color` text,
	`linked_wallet_id` text,
	`is_completed` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_wallet_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `saving_goals`(
	"id",
	"user_id",
	"title",
	"target_amount",
	"current_amount",
	"target_date",
	"icon_type",
	"icon_name",
	"icon_image_uri",
	"emoji",
	"color",
	"linked_wallet_id",
	"is_completed",
	"is_archived",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"user_id",
	"name",
	"target_amount",
	"current_amount",
	coalesce("target_date", "created_at"),
	'vector',
	"icon",
	NULL,
	NULL,
	"color",
	NULL,
	CASE WHEN coalesce("current_amount", 0) >= coalesce("target_amount", 0) AND coalesce("target_amount", 0) > 0 THEN 1 ELSE 0 END,
	0,
	"created_at",
	"updated_at"
FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
CREATE INDEX `goals_user_idx` ON `saving_goals` (`user_id`);--> statement-breakpoint
CREATE INDEX `goals_target_date_idx` ON `saving_goals` (`target_date`);--> statement-breakpoint
CREATE INDEX `goals_linked_wallet_idx` ON `saving_goals` (`linked_wallet_id`);--> statement-breakpoint

CREATE TABLE `__new_goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`wallet_id` text,
	`amount` real NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `saving_goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wallet_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_goal_contributions`(
	"id",
	"goal_id",
	"wallet_id",
	"amount",
	"note",
	"created_at"
)
SELECT
	"id",
	"goal_id",
	"account_id",
	"amount",
	"note",
	coalesce("created_at", "contribution_date")
FROM `goal_contributions`;--> statement-breakpoint
DROP TABLE `goal_contributions`;--> statement-breakpoint
ALTER TABLE `__new_goal_contributions` RENAME TO `goal_contributions`;--> statement-breakpoint
CREATE INDEX `goal_contributions_goal_idx` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_wallet_idx` ON `goal_contributions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `goal_contributions_date_idx` ON `goal_contributions` (`created_at`);
