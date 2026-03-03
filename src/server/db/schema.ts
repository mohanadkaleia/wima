import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  apiEndpoint: text("api_endpoint").notNull(),
  apiToken: text("api_token").notNull(),
  webhookSecret: text("webhook_secret"),
  createdAt: integer("created_at").notNull(),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("idle"),
  currentTaskId: text("current_task_id"),
  metadata: text("metadata").notNull().default("{}"),
  lastSeenAt: integer("last_seen_at"),
  createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("backlog"),
  priority: integer("priority").notNull().default(0),
  assigneeAgentId: text("assignee_agent_id"),
  projectId: text("project_id"),
  parentTaskId: text("parent_task_id"),
  labels: text("labels").notNull().default("[]"),
  branchName: text("branch_name"),
  worktreePath: text("worktree_path"),
  prUrl: text("pr_url"),
  integrationId: text("integration_id"),
  createdAt: integer("created_at").notNull(),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  updatedAt: integer("updated_at").notNull(),
});

export const traces = sqliteTable("traces", {
  id: text("id").primaryKey(),
  taskId: text("task_id"),
  agentId: text("agent_id").notNull(),
  name: text("name").notNull(),
  input: text("input").notNull(),
  output: text("output"),
  totalTokens: integer("total_tokens"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costUsd: real("cost_usd"),
  metadata: text("metadata").notNull().default("{}"),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  durationMs: integer("duration_ms"),
});

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  traceId: text("trace_id")
    .notNull()
    .references(() => traces.id),
  parentObservationId: text("parent_observation_id"),
  type: text("type").notNull(),
  name: text("name").notNull(),
  input: text("input"),
  output: text("output"),
  model: text("model"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costUsd: real("cost_usd"),
  toolName: text("tool_name"),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  durationMs: integer("duration_ms"),
});

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  taskId: text("task_id"),
  type: text("type").notNull().default("task"),
  createdAt: integer("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id")
    .notNull()
    .references(() => channels.id),
  fromAgentId: text("from_agent_id").notNull(),
  toAgentId: text("to_agent_id"),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  taskId: text("task_id"),
  traceId: text("trace_id"),
  agentId: text("agent_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("proposed"),
  context: text("context").notNull(),
  decision: text("decision").notNull(),
  alternatives: text("alternatives"),
  consequences: text("consequences"),
  createdAt: integer("created_at").notNull(),
});

export const docs = sqliteTable("docs", {
  id: text("id").primaryKey(),
  taskId: text("task_id"),
  agentId: text("agent_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  actorId: text("actor_id").notNull(),
  actorType: text("actor_type").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  payload: text("payload").notNull().default("{}"),
  integrationId: text("integration_id"),
  createdAt: integer("created_at").notNull(),
});
