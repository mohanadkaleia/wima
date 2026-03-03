#!/usr/bin/env npx tsx
/**
 * Seed Script — populates the database with sample data for development/demo.
 *
 * Run via: npx tsx src/scripts/seed.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";
import {
  integrations,
  agents,
  tasks,
  traces,
  observations,
  channels,
  messages,
  decisions,
  docs,
  events,
} from "../server/db/schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./swarmops.db",
});

const db = drizzle(client);

async function seed() {
  console.log("[seed] Seeding database...");

  const now = Date.now();
  const hour = 3_600_000;
  const day = 24 * hour;

  // -------------------------------------------------------------------------
  // 1. Integration — OpenClaw
  // -------------------------------------------------------------------------
  const integrationId = nanoid();
  const apiToken = `swo_${nanoid(32)}`;

  await db.insert(integrations).values({
    id: integrationId,
    name: "OpenClaw",
    type: "openclaw",
    apiEndpoint: "http://localhost:3000/api/v1/ingest",
    apiToken,
    webhookSecret: null,
    createdAt: now - 7 * day,
  });

  console.log(`[seed] Integration created: OpenClaw (token: ${apiToken})`);

  // -------------------------------------------------------------------------
  // 2. Agents
  // -------------------------------------------------------------------------
  const agentIds = [nanoid(), nanoid(), nanoid()];
  const agentNames = ["claude-worker-1", "claude-worker-2", "claude-worker-3"];

  for (let i = 0; i < 3; i++) {
    await db.insert(agents).values({
      id: agentIds[i],
      integrationId,
      name: agentNames[i],
      type: "claude-code",
      status: i === 0 ? "running" : "idle",
      currentTaskId: null,
      metadata: JSON.stringify({ model: "claude-opus-4-6", maxTokens: 200000 }),
      lastSeenAt: now - i * 5 * 60_000,
      createdAt: now - 7 * day,
    });
  }

  console.log("[seed] 3 agents created");

  // -------------------------------------------------------------------------
  // 3. Tasks
  // -------------------------------------------------------------------------
  const taskRecords = [
    {
      id: nanoid(),
      identifier: "SWARM-1",
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment",
      status: "done",
      priority: 2,
      assigneeAgentId: agentIds[0],
      projectId: null,
      parentTaskId: null,
      labels: JSON.stringify(["infra", "ci"]),
      branchName: "feat/ci-pipeline",
      worktreePath: null,
      prUrl: "https://github.com/example/swarmops/pull/1",
      integrationId,
      createdAt: now - 5 * day,
      startedAt: now - 5 * day,
      completedAt: now - 4 * day,
      updatedAt: now - 4 * day,
    },
    {
      id: nanoid(),
      identifier: "SWARM-2",
      title: "Implement task board UI",
      description: "Build the kanban-style task board with drag and drop",
      status: "in_progress",
      priority: 1,
      assigneeAgentId: agentIds[0],
      projectId: null,
      parentTaskId: null,
      labels: JSON.stringify(["ui", "feature"]),
      branchName: "feat/task-board",
      worktreePath: "~/openclaw-worktrees/task-board",
      prUrl: null,
      integrationId,
      createdAt: now - 3 * day,
      startedAt: now - 2 * day,
      completedAt: null,
      updatedAt: now - hour,
    },
    {
      id: nanoid(),
      identifier: "SWARM-3",
      title: "Add agent heartbeat monitoring",
      description: "Track agent liveness with periodic heartbeat checks",
      status: "in_progress",
      priority: 1,
      assigneeAgentId: agentIds[1],
      projectId: null,
      parentTaskId: null,
      labels: JSON.stringify(["monitoring"]),
      branchName: "feat/heartbeat",
      worktreePath: null,
      prUrl: null,
      integrationId,
      createdAt: now - 2 * day,
      startedAt: now - day,
      completedAt: null,
      updatedAt: now - 2 * hour,
    },
    {
      id: nanoid(),
      identifier: "SWARM-4",
      title: "Design decision log page",
      description: "Create the ADR (Architecture Decision Record) viewer",
      status: "backlog",
      priority: 0,
      assigneeAgentId: null,
      projectId: null,
      parentTaskId: null,
      labels: JSON.stringify(["ui", "docs"]),
      branchName: null,
      worktreePath: null,
      prUrl: null,
      integrationId,
      createdAt: now - day,
      startedAt: null,
      completedAt: null,
      updatedAt: now - day,
    },
    {
      id: nanoid(),
      identifier: "SWARM-5",
      title: "Write API documentation",
      description: "Document all ingest API endpoints and event types",
      status: "backlog",
      priority: 0,
      assigneeAgentId: null,
      projectId: null,
      parentTaskId: null,
      labels: JSON.stringify(["docs"]),
      branchName: null,
      worktreePath: null,
      prUrl: null,
      integrationId,
      createdAt: now - 12 * hour,
      startedAt: null,
      completedAt: null,
      updatedAt: now - 12 * hour,
    },
  ];

  for (const t of taskRecords) {
    await db.insert(tasks).values(t);
  }

  console.log("[seed] 5 tasks created");

  // -------------------------------------------------------------------------
  // 4. Traces + Observations
  // -------------------------------------------------------------------------
  const traceId1 = nanoid();
  const traceId2 = nanoid();

  await db.insert(traces).values({
    id: traceId1,
    taskId: taskRecords[0].id,
    agentId: agentIds[0],
    name: "ci-pipeline-setup",
    input: "Set up GitHub Actions CI/CD pipeline",
    output: "Pipeline configured with test, lint, and deploy stages",
    totalTokens: 45200,
    promptTokens: 12300,
    completionTokens: 32900,
    costUsd: 0.087,
    metadata: JSON.stringify({ model: "claude-opus-4-6" }),
    startTime: now - 5 * day,
    endTime: now - 5 * day + 15 * 60_000,
    durationMs: 15 * 60_000,
  });

  await db.insert(traces).values({
    id: traceId2,
    taskId: taskRecords[1].id,
    agentId: agentIds[0],
    name: "task-board-implementation",
    input: "Build kanban task board with drag and drop",
    output: null,
    totalTokens: 78400,
    promptTokens: 23100,
    completionTokens: 55300,
    costUsd: 0.156,
    metadata: JSON.stringify({ model: "claude-opus-4-6" }),
    startTime: now - 2 * day,
    endTime: null,
    durationMs: null,
  });

  // Observations for trace 1
  const obs = [
    {
      id: nanoid(),
      traceId: traceId1,
      parentObservationId: null,
      type: "tool_call",
      name: "Read .github/workflows",
      input: ".github/workflows/ci.yml",
      output: "File not found",
      model: null,
      promptTokens: null,
      completionTokens: null,
      costUsd: null,
      toolName: "Read",
      startTime: now - 5 * day + 60_000,
      endTime: now - 5 * day + 62_000,
      durationMs: 2000,
    },
    {
      id: nanoid(),
      traceId: traceId1,
      parentObservationId: null,
      type: "tool_call",
      name: "Write CI config",
      input: "name: CI\\non: [push, pull_request]\\njobs:...",
      output: "File created successfully",
      model: null,
      promptTokens: null,
      completionTokens: null,
      costUsd: null,
      toolName: "Write",
      startTime: now - 5 * day + 120_000,
      endTime: now - 5 * day + 125_000,
      durationMs: 5000,
    },
    {
      id: nanoid(),
      traceId: traceId2,
      parentObservationId: null,
      type: "tool_call",
      name: "Read existing task page",
      input: "src/app/tasks/page.tsx",
      output: "export default function TasksPage()...",
      model: null,
      promptTokens: null,
      completionTokens: null,
      costUsd: null,
      toolName: "Read",
      startTime: now - 2 * day + 30_000,
      endTime: now - 2 * day + 32_000,
      durationMs: 2000,
    },
  ];

  for (const o of obs) {
    await db.insert(observations).values(o);
  }

  console.log("[seed] 2 traces + 3 observations created");

  // -------------------------------------------------------------------------
  // 5. Channel + Messages
  // -------------------------------------------------------------------------
  const channelId = nanoid();

  await db.insert(channels).values({
    id: channelId,
    name: "task-board-discussion",
    taskId: taskRecords[1].id,
    type: "task",
    createdAt: now - 2 * day,
  });

  const msgData = [
    {
      id: nanoid(),
      channelId,
      fromAgentId: agentIds[0],
      toAgentId: null,
      content: "Starting work on the task board UI. Will use react-beautiful-dnd for drag-and-drop.",
      type: "text",
      metadata: JSON.stringify({}),
      createdAt: now - 2 * day + 5 * 60_000,
    },
    {
      id: nanoid(),
      channelId,
      fromAgentId: agentIds[1],
      toAgentId: agentIds[0],
      content: "Consider using @hello-pangea/dnd instead — it's the maintained fork.",
      type: "text",
      metadata: JSON.stringify({}),
      createdAt: now - 2 * day + 10 * 60_000,
    },
    {
      id: nanoid(),
      channelId,
      fromAgentId: agentIds[0],
      toAgentId: null,
      content: "Good call. Switching to @hello-pangea/dnd.",
      type: "text",
      metadata: JSON.stringify({}),
      createdAt: now - 2 * day + 15 * 60_000,
    },
  ];

  for (const m of msgData) {
    await db.insert(messages).values(m);
  }

  console.log("[seed] 1 channel + 3 messages created");

  // -------------------------------------------------------------------------
  // 6. Decisions (ADRs)
  // -------------------------------------------------------------------------
  await db.insert(decisions).values({
    id: nanoid(),
    taskId: taskRecords[0].id,
    traceId: traceId1,
    agentId: agentIds[0],
    title: "Use GitHub Actions over Jenkins for CI/CD",
    status: "accepted",
    context: "Need a CI/CD solution that integrates tightly with our GitHub-hosted repository.",
    decision: "Use GitHub Actions with reusable workflows for CI/CD pipeline.",
    alternatives: JSON.stringify([
      "Jenkins — powerful but requires self-hosted infrastructure",
      "CircleCI — good but adds another third-party dependency",
    ]),
    consequences: JSON.stringify([
      "Tighter GitHub integration, simpler configuration",
      "Limited to GitHub Actions minutes quota",
    ]),
    createdAt: now - 5 * day + 10 * 60_000,
  });

  await db.insert(decisions).values({
    id: nanoid(),
    taskId: taskRecords[1].id,
    traceId: traceId2,
    agentId: agentIds[0],
    title: "Use @hello-pangea/dnd for drag-and-drop",
    status: "proposed",
    context: "The task board needs drag-and-drop for moving tasks between columns.",
    decision: "Use @hello-pangea/dnd (maintained fork of react-beautiful-dnd).",
    alternatives: JSON.stringify([
      "react-beautiful-dnd — unmaintained, last release 2021",
      "dnd-kit — more flexible but steeper learning curve",
    ]),
    consequences: JSON.stringify([
      "Well-documented API with active maintenance",
      "Slightly larger bundle size than dnd-kit",
    ]),
    createdAt: now - 2 * day + 20 * 60_000,
  });

  console.log("[seed] 2 decisions created");

  // -------------------------------------------------------------------------
  // 7. Doc
  // -------------------------------------------------------------------------
  await db.insert(docs).values({
    id: nanoid(),
    taskId: taskRecords[0].id,
    agentId: agentIds[0],
    type: "runbook",
    title: "CI/CD Pipeline Runbook",
    content:
      "# CI/CD Pipeline\n\n" +
      "## Overview\nGitHub Actions workflow runs on every push and PR.\n\n" +
      "## Stages\n1. **Lint** — ESLint + Prettier\n2. **Test** — Vitest\n3. **Build** — Next.js build\n4. **Deploy** — Vercel preview (PR) / production (main)\n\n" +
      "## Troubleshooting\n- If build fails, check `npm run build` locally\n- Token secrets are in GitHub repo settings",
    version: 1,
    createdAt: now - 4 * day,
    updatedAt: now - 4 * day,
  });

  console.log("[seed] 1 doc created");

  // -------------------------------------------------------------------------
  // 8. Activity Events
  // -------------------------------------------------------------------------
  const eventData = [
    {
      id: nanoid(),
      type: "integration.created",
      actorId: "system",
      actorType: "system",
      resourceType: "integration",
      resourceId: integrationId,
      payload: JSON.stringify({ name: "OpenClaw" }),
      integrationId: null,
      createdAt: now - 7 * day,
    },
    {
      id: nanoid(),
      type: "task.created",
      actorId: agentIds[0],
      actorType: "agent",
      resourceType: "task",
      resourceId: taskRecords[0].id,
      payload: JSON.stringify({ title: taskRecords[0].title }),
      integrationId,
      createdAt: now - 5 * day,
    },
    {
      id: nanoid(),
      type: "task.completed",
      actorId: agentIds[0],
      actorType: "agent",
      resourceType: "task",
      resourceId: taskRecords[0].id,
      payload: JSON.stringify({ title: taskRecords[0].title }),
      integrationId,
      createdAt: now - 4 * day,
    },
    {
      id: nanoid(),
      type: "task.created",
      actorId: agentIds[0],
      actorType: "agent",
      resourceType: "task",
      resourceId: taskRecords[1].id,
      payload: JSON.stringify({ title: taskRecords[1].title }),
      integrationId,
      createdAt: now - 3 * day,
    },
    {
      id: nanoid(),
      type: "agent.status_changed",
      actorId: agentIds[0],
      actorType: "agent",
      resourceType: "agent",
      resourceId: agentIds[0],
      payload: JSON.stringify({ from: "idle", to: "running" }),
      integrationId,
      createdAt: now - 2 * day,
    },
    {
      id: nanoid(),
      type: "task.updated",
      actorId: agentIds[1],
      actorType: "agent",
      resourceType: "task",
      resourceId: taskRecords[2].id,
      payload: JSON.stringify({ title: taskRecords[2].title, status: "in_progress" }),
      integrationId,
      createdAt: now - day,
    },
  ];

  for (const e of eventData) {
    await db.insert(events).values(e);
  }

  console.log("[seed] 6 activity events created");

  // -------------------------------------------------------------------------
  console.log("\n[seed] Done! Database seeded successfully.");
  console.log(`[seed] OpenClaw API token: ${apiToken}`);
  console.log("[seed] Use this token with the openclaw-sync script.");
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
