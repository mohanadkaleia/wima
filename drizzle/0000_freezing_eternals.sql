CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`integration_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`current_task_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`last_seen_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`task_id` text,
	`type` text DEFAULT 'task' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`trace_id` text,
	`agent_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`context` text NOT NULL,
	`decision` text NOT NULL,
	`alternatives` text,
	`consequences` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `docs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`agent_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`integration_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`api_endpoint` text NOT NULL,
	`api_token` text NOT NULL,
	`webhook_secret` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`from_agent_id` text NOT NULL,
	`to_agent_id` text,
	`content` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`parent_observation_id` text,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`input` text,
	`output` text,
	`model` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`cost_usd` real,
	`tool_name` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	FOREIGN KEY (`trace_id`) REFERENCES `traces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'backlog' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`assignee_agent_id` text,
	`project_id` text,
	`parent_task_id` text,
	`labels` text DEFAULT '[]' NOT NULL,
	`branch_name` text,
	`worktree_path` text,
	`pr_url` text,
	`integration_id` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_identifier_unique` ON `tasks` (`identifier`);--> statement-breakpoint
CREATE TABLE `traces` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`input` text NOT NULL,
	`output` text,
	`total_tokens` integer,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`cost_usd` real,
	`metadata` text DEFAULT '{}' NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer
);
