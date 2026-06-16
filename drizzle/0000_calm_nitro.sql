CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`systolic` integer NOT NULL,
	`diastolic` integer NOT NULL,
	`pulse` integer,
	`arm` text DEFAULT 'left' NOT NULL,
	`position` text DEFAULT 'sitting' NOT NULL,
	`notes` text,
	`measured_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_measurements_user_id` ON `measurements` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_measurements_measured_at` ON `measurements` (`measured_at`);--> statement-breakpoint
CREATE INDEX `idx_measurements_user_date` ON `measurements` (`user_id`,`measured_at`);--> statement-breakpoint
CREATE TABLE `reminder_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`times` text DEFAULT '["08:00","20:00"]' NOT NULL,
	`email_enabled` integer DEFAULT true NOT NULL,
	`browser_enabled` integer DEFAULT true NOT NULL,
	`timezone` text DEFAULT 'America/Chihuahua' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);