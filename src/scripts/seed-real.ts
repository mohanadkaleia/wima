/**
 * Seeds realistic data matching Mohanad's actual OpenClaw setup.
 * Run: npx tsx src/scripts/seed-real.ts
 */
import { nanoid } from "nanoid";
import { db } from "../server/db/index.js";
import {
  agents,
  integrations,
  traces,
  observations,
  channels,
  messages,
  decisions,
  docs,
  events,
  tasks,
} from "../server/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  // Get the OpenClaw integration
  const [integration] = await db.select().from(integrations).limit(1);
  if (!integration) {
    console.error("No integration found. Run seed.ts first.");
    process.exit(1);
  }

  const now = Date.now();
  const hour = 3600_000;

  // --- Agents (matching real OpenClaw setup) ---
  const sharshoorId = nanoid();
  const worker1Id = nanoid();
  const worker2Id = nanoid();

  await db.insert(agents).values([
    {
      id: sharshoorId,
      integrationId: integration.id,
      name: "Sharshoor (PM)",
      type: "pm",
      status: "running",
      currentTaskId: null,
      metadata: JSON.stringify({ model: "claude-sonnet-4-6", role: "project-manager" }),
      lastSeenAt: now,
      createdAt: now - 2 * hour,
    },
    {
      id: worker1Id,
      integrationId: integration.id,
      name: "claude-worker-1",
      type: "claude-code",
      status: "idle",
      currentTaskId: null,
      metadata: JSON.stringify({ model: "claude-sonnet-4-6", spawnMethod: "bash-pty" }),
      lastSeenAt: now - 30 * 60_000,
      createdAt: now - 2 * hour,
    },
    {
      id: worker2Id,
      integrationId: integration.id,
      name: "claude-worker-2",
      type: "claude-code",
      status: "idle",
      currentTaskId: null,
      metadata: JSON.stringify({ model: "claude-sonnet-4-6", spawnMethod: "bash-pty" }),
      lastSeenAt: now - 45 * 60_000,
      createdAt: now - 2 * hour,
    },
  ]);
  console.log("3 agents created (Sharshoor + 2 workers)");

  // --- Get real tasks ---
  const realTasks = await db.select().from(tasks);
  const todoTask = realTasks.find((t) => t.title === "todo-cli");
  const blogTask = realTasks.find((t) => t.title === "blog");

  // --- Traces for real tasks ---
  const trace1Id = nanoid();
  const trace2Id = nanoid();

  if (todoTask) {
    await db.insert(traces).values({
      id: trace1Id,
      taskId: todoTask.id,
      agentId: worker1Id,
      name: "todo-cli",
      input: "Build a simple Python CLI todo app at ~/workspace/todo-cli",
      output: "Python CLI todo app completed with add, remove, list, and complete commands.",
      totalTokens: 45200,
      promptTokens: 32100,
      completionTokens: 13100,
      costUsd: 0.18,
      metadata: JSON.stringify({ worktree: "~/openclaw-worktrees/todo-cli" }),
      startTime: new Date("2026-03-01T20:44:00Z").getTime(),
      endTime: new Date("2026-03-01T21:04:03Z").getTime(),
      durationMs: 20 * 60_000,
    });

    // Observations for todo-cli trace
    await db.insert(observations).values([
      {
        id: nanoid(),
        traceId: trace1Id,
        parentObservationId: null,
        type: "tool_call",
        name: "Bash: mkdir -p ~/workspace/todo-cli && cd ~/workspace/todo-cli",
        input: "mkdir -p ~/workspace/todo-cli",
        output: null,
        toolName: "Bash",
        startTime: new Date("2026-03-01T20:44:10Z").getTime(),
        endTime: new Date("2026-03-01T20:44:11Z").getTime(),
        durationMs: 1000,
        model: null, promptTokens: null, completionTokens: null, costUsd: null,
      },
      {
        id: nanoid(),
        traceId: trace1Id,
        parentObservationId: null,
        type: "tool_call",
        name: "Write: todo_cli/main.py",
        input: "todo_cli/main.py",
        output: "Created main CLI entry point with argparse",
        toolName: "Write",
        startTime: new Date("2026-03-01T20:45:00Z").getTime(),
        endTime: new Date("2026-03-01T20:45:30Z").getTime(),
        durationMs: 30_000,
        model: null, promptTokens: null, completionTokens: null, costUsd: null,
      },
      {
        id: nanoid(),
        traceId: trace1Id,
        parentObservationId: null,
        type: "generation",
        name: "LLM: Plan todo CLI structure",
        input: "Design a Python CLI todo app with add, remove, list, complete commands",
        output: "Planned: main.py with argparse, storage.py for JSON persistence, models.py for Todo dataclass",
        toolName: null,
        model: "claude-sonnet-4-6",
        promptTokens: 1200,
        completionTokens: 800,
        costUsd: 0.012,
        startTime: new Date("2026-03-01T20:44:30Z").getTime(),
        endTime: new Date("2026-03-01T20:44:45Z").getTime(),
        durationMs: 15_000,
      },
      {
        id: nanoid(),
        traceId: trace1Id,
        parentObservationId: null,
        type: "tool_call",
        name: "Bash: python -m pytest tests/",
        input: "python -m pytest tests/ -v",
        output: "4 passed in 0.32s",
        toolName: "Bash",
        startTime: new Date("2026-03-01T21:02:00Z").getTime(),
        endTime: new Date("2026-03-01T21:02:05Z").getTime(),
        durationMs: 5000,
        model: null, promptTokens: null, completionTokens: null, costUsd: null,
      },
    ]);
  }

  if (blogTask) {
    await db.insert(traces).values({
      id: trace2Id,
      taskId: blogTask.id,
      agentId: worker2Id,
      name: "blog",
      input: "Dead-simple markdown blog at ~/projects/blog (Next.js + Tailwind + MDX)",
      output: "Next.js + Tailwind + MDX blog scaffolded with 3 sample posts and dynamic routing.",
      totalTokens: 28500,
      promptTokens: 19200,
      completionTokens: 9300,
      costUsd: 0.11,
      metadata: JSON.stringify({ worktree: "~/openclaw-worktrees/blog" }),
      startTime: new Date("2026-03-01T20:22:00Z").getTime(),
      endTime: new Date("2026-03-01T20:27:27Z").getTime(),
      durationMs: 5 * 60_000 + 27_000,
    });
  }
  console.log("2 traces + 4 observations created");

  // --- Channel + Messages ---
  const channelId = nanoid();
  await db.insert(channels).values({
    id: channelId,
    name: "#task-todo-cli",
    taskId: todoTask?.id ?? null,
    type: "task",
    createdAt: now - hour,
  });

  await db.insert(messages).values([
    {
      id: nanoid(),
      channelId,
      fromAgentId: sharshoorId,
      toAgentId: worker1Id,
      content: "Build a simple Python CLI todo app at ~/workspace/todo-cli. Use argparse, JSON for storage. Include add, remove, list, and complete commands.",
      type: "handoff",
      metadata: JSON.stringify({ taskSlug: "todo-cli", worktree: "~/openclaw-worktrees/todo-cli" }),
      createdAt: new Date("2026-03-01T20:44:00Z").getTime(),
    },
    {
      id: nanoid(),
      channelId,
      fromAgentId: worker1Id,
      toAgentId: null,
      content: "Started working on todo-cli. Setting up project structure with main.py, storage.py, and tests/.",
      type: "status_update",
      metadata: "{}",
      createdAt: new Date("2026-03-01T20:45:00Z").getTime(),
    },
    {
      id: nanoid(),
      channelId,
      fromAgentId: worker1Id,
      toAgentId: null,
      content: "All done. Python CLI todo app completed with 4 commands (add, remove, list, complete). All tests passing. Ready for review.",
      type: "text",
      metadata: "{}",
      createdAt: new Date("2026-03-01T21:04:00Z").getTime(),
    },
    {
      id: nanoid(),
      channelId,
      fromAgentId: sharshoorId,
      toAgentId: null,
      content: "Nice work. Task marked as complete. Worktree cleaned up.",
      type: "text",
      metadata: "{}",
      createdAt: new Date("2026-03-01T21:05:00Z").getTime(),
    },
  ]);
  console.log("1 channel + 4 messages created");

  // --- Decisions (ADRs) ---
  await db.insert(decisions).values([
    {
      id: nanoid(),
      taskId: todoTask?.id ?? null,
      traceId: trace1Id,
      agentId: worker1Id,
      title: "Use JSON file storage instead of SQLite for todo CLI",
      status: "accepted",
      context: "The todo CLI app needs persistent storage for tasks. Options considered were SQLite, JSON file, and plain text file. Since this is a simple CLI tool meant for personal use, we need the simplest possible storage that requires no external dependencies.",
      decision: "Use a JSON file (~/.todo/tasks.json) for storage. The `storage.py` module handles reading/writing with file locking for safety.",
      alternatives: "**SQLite**: More robust but overkill for a simple CLI. Adds dependency on sqlite3 module and creates binary files that aren't human-readable.\n\n**Plain text**: Too fragile, would need custom parsing. No structured data support.",
      consequences: "**Positive**: Zero dependencies, human-readable storage, easy to debug and manually edit.\n\n**Negative**: No concurrent access support (acceptable for single-user CLI), no query capabilities beyond full-file read.",
      createdAt: new Date("2026-03-01T20:46:00Z").getTime(),
    },
    {
      id: nanoid(),
      taskId: blogTask?.id ?? null,
      traceId: trace2Id,
      agentId: worker2Id,
      title: "Use MDX over plain Markdown for blog posts",
      status: "accepted",
      context: "The blog needs to render markdown content. We could use plain markdown with a renderer, or MDX which allows embedding React components within markdown content.",
      decision: "Use MDX via @next/mdx. Blog posts are .mdx files in the content/ directory with frontmatter for metadata (title, date, tags).",
      alternatives: "**Plain Markdown + react-markdown**: Simpler setup but no component embedding. Would need a separate system for interactive elements.\n\n**Contentlayer**: Great DX but adds significant complexity and another dependency to manage.",
      consequences: "**Positive**: Can embed interactive React components in posts, great DX with Next.js, future-proof for rich content.\n\n**Negative**: Slightly more complex build pipeline, MDX syntax can confuse non-technical editors.",
      createdAt: new Date("2026-03-01T20:24:00Z").getTime(),
    },
  ]);
  console.log("2 decisions (ADRs) created");

  // --- Docs ---
  await db.insert(docs).values({
    id: nanoid(),
    taskId: todoTask?.id ?? null,
    agentId: worker1Id,
    type: "readme",
    title: "todo-cli README",
    content: "# Todo CLI\n\nA simple command-line todo manager built in Python.\n\n## Usage\n\n```bash\n# Add a task\npython -m todo_cli add \"Buy groceries\"\n\n# List all tasks\npython -m todo_cli list\n\n# Complete a task\npython -m todo_cli complete 1\n\n# Remove a task\npython -m todo_cli remove 1\n```\n\n## Storage\n\nTasks are stored in `~/.todo/tasks.json`.\n\n## Testing\n\n```bash\npython -m pytest tests/ -v\n```",
    version: 1,
    createdAt: new Date("2026-03-01T21:03:00Z").getTime(),
    updatedAt: new Date("2026-03-01T21:03:00Z").getTime(),
  });
  console.log("1 doc created");

  // --- Activity Events ---
  await db.insert(events).values([
    {
      id: nanoid(), type: "task.created", actorId: sharshoorId, actorType: "agent",
      resourceType: "task", resourceId: "todo-cli", payload: "{}", integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:44:00Z").getTime(),
    },
    {
      id: nanoid(), type: "agent.started", actorId: worker1Id, actorType: "agent",
      resourceType: "agent", resourceId: worker1Id, payload: JSON.stringify({ task: "todo-cli" }), integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:44:05Z").getTime(),
    },
    {
      id: nanoid(), type: "task.completed", actorId: worker1Id, actorType: "agent",
      resourceType: "task", resourceId: "todo-cli", payload: "{}", integrationId: integration.id,
      createdAt: new Date("2026-03-01T21:04:03Z").getTime(),
    },
    {
      id: nanoid(), type: "task.created", actorId: sharshoorId, actorType: "agent",
      resourceType: "task", resourceId: "blog", payload: "{}", integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:22:00Z").getTime(),
    },
    {
      id: nanoid(), type: "agent.started", actorId: worker2Id, actorType: "agent",
      resourceType: "agent", resourceId: worker2Id, payload: JSON.stringify({ task: "blog" }), integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:22:05Z").getTime(),
    },
    {
      id: nanoid(), type: "task.completed", actorId: worker2Id, actorType: "agent",
      resourceType: "task", resourceId: "blog", payload: "{}", integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:27:27Z").getTime(),
    },
    {
      id: nanoid(), type: "decision.created", actorId: worker1Id, actorType: "agent",
      resourceType: "decision", resourceId: "json-storage", payload: JSON.stringify({ title: "Use JSON file storage" }), integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:46:00Z").getTime(),
    },
    {
      id: nanoid(), type: "message.sent", actorId: sharshoorId, actorType: "agent",
      resourceType: "message", resourceId: "handoff", payload: JSON.stringify({ channel: "#task-todo-cli" }), integrationId: integration.id,
      createdAt: new Date("2026-03-01T20:44:00Z").getTime(),
    },
  ]);
  console.log("8 activity events created");

  console.log("\nDone! Refresh SwarmOps to see everything.");
}

main().catch(console.error);
