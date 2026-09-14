CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder_sends` (
	`user_id` text NOT NULL,
	`slot` text NOT NULL,
	`sent_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `slot`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
