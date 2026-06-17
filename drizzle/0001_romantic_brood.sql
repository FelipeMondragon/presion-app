ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `security_question` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `security_answer` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);