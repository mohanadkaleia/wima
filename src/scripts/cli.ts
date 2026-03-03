#!/usr/bin/env node
/**
 * SwarmOps CLI — lightweight agent integration tool.
 *
 * Usage:
 *   npx tsx <path>/cli.ts <command> [args]
 *
 * Commands:
 *   msg <message>           Post a message to the task channel
 *   status <status>         Update task status (in_progress, done, blocked, in_review)
 *   decision --title "..." --context "..." --decision "..." [--alternatives "..."] [--consequences "..."]
 *   done <summary>          Report completion with summary
 *
 * Environment variables:
 *   SWARMOPS_URL         Base URL (default http://localhost:3002)
 *   SWARMOPS_TOKEN       API token
 *   SWARMOPS_TASK_ID     Task ID in SwarmOps
 *   SWARMOPS_AGENT_ID    Agent ID
 *   SWARMOPS_TRACE_ID    Trace ID for this work session
 *   SWARMOPS_CHANNEL_ID  Task channel ID
 */

const BASE_URL = process.env.SWARMOPS_URL || "http://localhost:3002";
const TOKEN = process.env.SWARMOPS_TOKEN || "";
const TASK_ID = process.env.SWARMOPS_TASK_ID || "";
const AGENT_ID = process.env.SWARMOPS_AGENT_ID || "";
const TRACE_ID = process.env.SWARMOPS_TRACE_ID || "";
const CHANNEL_ID = process.env.SWARMOPS_CHANNEL_ID || "";

interface IngestEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  payload: Record<string, unknown>;
}

async function postEvents(events: IngestEvent[]): Promise<void> {
  const url = `${BASE_URL}/api/v1/ingest`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`SwarmOps ingest failed (${res.status}): ${body}`);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`SwarmOps: ${data.received} event(s) ingested`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`SwarmOps: Failed to reach ${url} — ${message}`);
    // Don't exit with error — agent should keep working even if SwarmOps is down
  }
}

function parseNamedArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result[key] = value;
        i++;
      } else {
        result[key] = "";
      }
    }
  }
  return result;
}

async function cmdMsg(args: string[]) {
  const message = args.join(" ");
  if (!message) {
    console.error("Usage: swarmops msg <message>");
    process.exit(1);
  }

  await postEvents([
    {
      type: "message.sent",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "message",
        resourceId: CHANNEL_ID,
        channelId: CHANNEL_ID,
        fromAgentId: AGENT_ID,
        content: message,
        messageType: "text",
      },
    },
  ]);
}

async function cmdStatus(args: string[]) {
  const status = args[0];
  if (!status) {
    console.error("Usage: swarmops status <in_progress|done|blocked|in_review>");
    process.exit(1);
  }

  const validStatuses = ["in_progress", "done", "blocked", "in_review"];
  if (!validStatuses.includes(status)) {
    console.error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`);
    process.exit(1);
  }

  const events: IngestEvent[] = [
    {
      type: "task.updated",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "task",
        resourceId: TASK_ID,
        taskId: TASK_ID,
        status,
      },
    },
  ];

  await postEvents(events);
}

async function cmdDecision(args: string[]) {
  const named = parseNamedArgs(args);

  if (!named.title || !named.context || !named.decision) {
    console.error(
      'Usage: swarmops decision --title "..." --context "..." --decision "..." [--alternatives "..."] [--consequences "..."]'
    );
    process.exit(1);
  }

  await postEvents([
    {
      type: "decision.created",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "decision",
        resourceId: TASK_ID,
        taskId: TASK_ID,
        traceId: TRACE_ID,
        agentId: AGENT_ID,
        title: named.title,
        context: named.context,
        decision: named.decision,
        alternatives: named.alternatives || null,
        consequences: named.consequences || null,
      },
    },
  ]);
}

async function cmdDone(args: string[]) {
  const summary = args.join(" ");
  if (!summary) {
    console.error("Usage: swarmops done <summary>");
    process.exit(1);
  }

  const events: IngestEvent[] = [
    // Post completion message
    {
      type: "message.sent",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "message",
        resourceId: CHANNEL_ID,
        channelId: CHANNEL_ID,
        fromAgentId: AGENT_ID,
        content: `Done: ${summary}`,
        messageType: "status",
      },
    },
    // Mark agent as completed
    {
      type: "agent.completed",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "agent",
        resourceId: AGENT_ID,
        taskId: TASK_ID,
        summary,
      },
    },
    // Mark task as done
    {
      type: "task.completed",
      timestamp: Date.now(),
      agentId: AGENT_ID,
      payload: {
        resourceType: "task",
        resourceId: TASK_ID,
        taskId: TASK_ID,
        slug: TASK_ID,
        summary,
      },
    },
  ];

  await postEvents(events);
}

// --- Main ---

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    console.error("Usage: swarmops <msg|status|decision|done> [args]");
    process.exit(1);
  }

  switch (command) {
    case "msg":
      await cmdMsg(rest);
      break;
    case "status":
      await cmdStatus(rest);
      break;
    case "decision":
      await cmdDecision(rest);
      break;
    case "done":
      await cmdDone(rest);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available commands: msg, status, decision, done");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("SwarmOps CLI error:", err);
  process.exit(1);
});
