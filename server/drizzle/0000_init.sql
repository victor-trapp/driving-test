CREATE TABLE `bookmarks` (
	`profile_id` integer NOT NULL,
	`question_id` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	PRIMARY KEY(`profile_id`, `question_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flashcard_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sign_id` text NOT NULL,
	`knew` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcards_profile_idx` ON `flashcard_reviews` (`profile_id`,`sign_id`);--> statement-breakpoint
CREATE TABLE `hazard_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`clip_id` text NOT NULL,
	`run_id` text,
	`clicks` text NOT NULL,
	`result` text NOT NULL,
	`total` integer NOT NULL,
	`max` integer NOT NULL,
	`flagged` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`clip_id`) REFERENCES `hazard_clips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hazard_attempts_profile_idx` ON `hazard_attempts` (`profile_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `hazard_clips` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`kind` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`scenario` text,
	`src` text,
	`hazards` text NOT NULL,
	`pattern` text,
	`licence` text NOT NULL,
	`origin` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`profile_id` integer NOT NULL,
	`lesson_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`completed_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	PRIMARY KEY(`profile_id`, `lesson_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mock_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` integer NOT NULL,
	`question_ids` text NOT NULL,
	`option_orders` text NOT NULL,
	`answers` text NOT NULL,
	`flags` text NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`deadline_at` integer NOT NULL,
	`submitted_at` integer,
	`status` text NOT NULL,
	`score` integer,
	`passed` integer,
	`time_used_ms` integer,
	`has_scenario` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mock_profile_idx` ON `mock_tests` (`profile_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` integer NOT NULL,
	`mode` text NOT NULL,
	`topic` text,
	`question_ids` text NOT NULL,
	`option_orders` text NOT NULL,
	`answers` text NOT NULL,
	`results` text NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_profile_idx` ON `practice_sessions` (`profile_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`nation` text DEFAULT 'england' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`daily_goal` integer DEFAULT 20 NOT NULL,
	`test_date` text,
	`onboarded` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`question_id` text NOT NULL,
	`selected` text NOT NULL,
	`correct` integer NOT NULL,
	`time_ms` integer,
	`mode` text NOT NULL,
	`session_id` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_profile_time_idx` ON `question_attempts` (`profile_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_profile_question_idx` ON `question_attempts` (`profile_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`difficulty` integer NOT NULL,
	`text` text NOT NULL,
	`options` text NOT NULL,
	`correct` text NOT NULL,
	`explanation` text NOT NULL,
	`hc` text NOT NULL,
	`image` text,
	`scenario_id` text,
	`source_url` text NOT NULL,
	`last_verified` text NOT NULL,
	`content_version` integer NOT NULL,
	`origin` text NOT NULL,
	`import_batch` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `questions_topic_idx` ON `questions` (`topic`,`active`);--> statement-breakpoint
CREATE TABLE `topic_quiz_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`topic_id` text NOT NULL,
	`session_id` text NOT NULL,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`passed` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
