ALTER TABLE `categories` ADD COLUMN `icon_type` text DEFAULT 'vector' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `icon_name` text;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `icon_image_uri` text;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `emoji` text;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `is_system` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `is_archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `updated_at` text;--> statement-breakpoint
UPDATE `categories`
SET
  `icon_name` = COALESCE(`icon_name`, `icon`),
  `updated_at` = COALESCE(`updated_at`, `created_at`),
  `is_system` = CASE WHEN `user_id` = '__system__' THEN true ELSE COALESCE(`is_system`, false) END,
  `is_archived` = COALESCE(`is_archived`, false),
  `icon_type` = COALESCE(`icon_type`, 'vector');--> statement-breakpoint
CREATE INDEX `categories_archived_idx` ON `categories` (`is_archived`);
