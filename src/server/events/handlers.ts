import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  events,
  tasks,
  agents,
  traces,
  observations,
  channels,
  messages,
  decisions,
  docs,
} from "@/server/db/schema";
import { eventBus, type SwarmEvent } from "./bus";

/**
 * Find a task by its slug (stored in the title or description).
 * OpenClaw tasks use slug as the primary identifier.
 */
async function findTaskBySlug(slug: string) {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.title, slug))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Find a task by its ID.
 */
async function findTaskById(id: string) {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Generate the next SW-N identifier.
 */
async function nextIdentifier(): Promise<string> {
  const all = await db
    .select({ identifier: tasks.identifier })
    .from(tasks)
    .orderBy(desc(tasks.createdAt));
  let nextNum = 1;
  if (all.length > 0) {
    const nums = all
      .map((r) => parseInt(r.identifier.replace("SW-", ""), 10))
      .filter((n) => !isNaN(n));
    if (nums.length > 0) nextNum = Math.max(...nums) + 1;
  }
  return `SW-${nextNum}`;
}

/**
 * Handle an ingest event: write to events table AND create/update domain records.
 */
export async function handleIngestEvent(event: SwarmEvent, integrationId?: string) {
  const now = event.timestamp ?? Date.now();
  const payload = event.payload;
  const slug = payload.slug as string | undefined;

  let resourceId = (payload.resourceId as string) ?? slug ?? "unknown";

  // --- Task events ---

  if (event.type === "task.created" && slug) {
    const existing = await findTaskBySlug(slug);
    if (!existing) {
      const identifier = await nextIdentifier();
      const id = nanoid();
      await db.insert(tasks).values({
        id,
        identifier,
        title: slug,
        description: (payload.description as string) ?? "",
        status: (payload.status as string) ?? "backlog",
        priority: 0,
        labels: "[]",
        integrationId: integrationId ?? null,
        branchName: null,
        worktreePath: null,
        prUrl: null,
        assigneeAgentId: null,
        projectId: null,
        parentTaskId: null,
        createdAt: now,
        startedAt: null,
        completedAt: null,
        updatedAt: now,
      });
      resourceId = id;
    } else {
      resourceId = existing.id;
    }
  }

  if (event.type === "task.updated") {
    // Support both slug-based and ID-based lookups
    const taskId = payload.taskId as string | undefined;
    let existing = slug ? await findTaskBySlug(slug) : null;
    if (!existing && taskId) {
      existing = await findTaskById(taskId);
    }

    if (existing) {
      const updates: Record<string, unknown> = {
        status: (payload.status as string) ?? existing.status,
        updatedAt: now,
      };
      if (payload.status === "in_progress" && !existing.startedAt) {
        updates.startedAt = now;
      }
      if (payload.description) {
        updates.description = payload.description as string;
      }
      await db.update(tasks).set(updates).where(eq(tasks.id, existing.id));
      resourceId = existing.id;
    } else if (slug) {
      // Task doesn't exist yet — create it
      const identifier = await nextIdentifier();
      const id = nanoid();
      await db.insert(tasks).values({
        id,
        identifier,
        title: slug,
        description: (payload.description as string) ?? "",
        status: (payload.status as string) ?? "in_progress",
        priority: 0,
        labels: "[]",
        integrationId: integrationId ?? null,
        branchName: null,
        worktreePath: null,
        prUrl: null,
        assigneeAgentId: null,
        projectId: null,
        parentTaskId: null,
        createdAt: now,
        startedAt: payload.status === "in_progress" ? now : null,
        completedAt: null,
        updatedAt: now,
      });
      resourceId = id;
    }
  }

  if (event.type === "task.completed") {
    const taskId = payload.taskId as string | undefined;
    let existing = slug ? await findTaskBySlug(slug) : null;
    if (!existing && taskId) {
      existing = await findTaskById(taskId);
    }

    if (existing) {
      await db
        .update(tasks)
        .set({
          status: "done",
          completedAt: payload.completedAt
            ? new Date(payload.completedAt as string).getTime()
            : now,
          description: (payload.summary as string) ?? existing.description,
          updatedAt: now,
        })
        .where(eq(tasks.id, existing.id));
      resourceId = existing.id;
    } else if (slug) {
      const identifier = await nextIdentifier();
      const id = nanoid();
      await db.insert(tasks).values({
        id,
        identifier,
        title: slug,
        description: (payload.summary as string) ?? (payload.description as string) ?? "",
        status: "done",
        priority: 0,
        labels: "[]",
        integrationId: integrationId ?? null,
        branchName: null,
        worktreePath: null,
        prUrl: null,
        assigneeAgentId: null,
        projectId: null,
        parentTaskId: null,
        createdAt: now,
        startedAt: payload.startedAt
          ? new Date(payload.startedAt as string).getTime()
          : null,
        completedAt: payload.completedAt
          ? new Date(payload.completedAt as string).getTime()
          : now,
        updatedAt: now,
      });
      resourceId = id;
    }
  }

  // --- Agent events ---

  if (event.type === "agent.registered") {
    const agentName = payload.name as string;
    const agentType = (payload.agentType as string) ?? "claude-code";
    const model = (payload.model as string) ?? "claude-sonnet-4-6";

    if (agentName) {
      // Check if agent with this name exists for this integration
      const existingAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.name, agentName))
        .limit(1);

      if (existingAgents[0]) {
        // Update existing agent
        await db
          .update(agents)
          .set({
            status: "idle",
            lastSeenAt: now,
            metadata: JSON.stringify({ model }),
          })
          .where(eq(agents.id, existingAgents[0].id));
        resourceId = existingAgents[0].id;
      } else {
        // Create new agent
        const id = (payload.agentId as string) ?? nanoid();
        await db.insert(agents).values({
          id,
          integrationId: integrationId ?? (payload.integrationId as string) ?? "",
          name: agentName,
          type: agentType,
          status: "idle",
          currentTaskId: null,
          metadata: JSON.stringify({ model }),
          lastSeenAt: now,
          createdAt: now,
        });
        resourceId = id;
      }
    }
  }

  if (event.type === "agent.started") {
    const agentId = event.agentId ?? (payload.agentId as string);
    const taskId = payload.taskId as string;

    if (agentId) {
      const existingAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      if (existingAgent[0]) {
        await db
          .update(agents)
          .set({
            status: "running",
            currentTaskId: taskId ?? null,
            lastSeenAt: now,
          })
          .where(eq(agents.id, agentId));
      }
      resourceId = agentId;
    }
  }

  if (event.type === "agent.completed") {
    const agentId = event.agentId ?? (payload.agentId as string);

    if (agentId) {
      const existingAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      if (existingAgent[0]) {
        await db
          .update(agents)
          .set({
            status: "idle",
            currentTaskId: null,
            lastSeenAt: now,
          })
          .where(eq(agents.id, agentId));
      }
      resourceId = agentId;
    }
  }

  if (event.type === "agent.failed") {
    const agentId = event.agentId ?? (payload.agentId as string);

    if (agentId) {
      const existingAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);

      if (existingAgent[0]) {
        await db
          .update(agents)
          .set({
            status: "error",
            currentTaskId: null,
            lastSeenAt: now,
          })
          .where(eq(agents.id, agentId));
      }
      resourceId = agentId;
    }
  }

  // --- Trace events ---

  if (event.type === "trace.started") {
    const id = (payload.traceId as string) ?? nanoid();
    const agentId = event.agentId ?? (payload.agentId as string) ?? "unknown";
    const taskId = payload.taskId as string | undefined;

    await db.insert(traces).values({
      id,
      taskId: taskId ?? null,
      agentId,
      name: (payload.name as string) ?? "trace",
      input: (payload.input as string) ?? "",
      output: null,
      totalTokens: null,
      promptTokens: null,
      completionTokens: null,
      costUsd: null,
      metadata: JSON.stringify({ model: payload.model ?? null }),
      startTime: now,
      endTime: null,
      durationMs: null,
    });
    resourceId = id;
  }

  if (event.type === "trace.completed") {
    const traceId = payload.traceId as string;

    if (traceId) {
      const existingTrace = await db
        .select()
        .from(traces)
        .where(eq(traces.id, traceId))
        .limit(1);

      if (existingTrace[0]) {
        await db
          .update(traces)
          .set({
            output: (payload.output as string) ?? null,
            totalTokens: (payload.totalTokens as number) ?? null,
            promptTokens: (payload.promptTokens as number) ?? null,
            completionTokens: (payload.completionTokens as number) ?? null,
            costUsd: (payload.costUsd as number) ?? null,
            durationMs: (payload.durationMs as number) ?? null,
            endTime: now,
            metadata: payload.model
              ? JSON.stringify({ model: payload.model })
              : existingTrace[0].metadata,
          })
          .where(eq(traces.id, traceId));

        // Also update the linked task with completion data if it exists
        if (existingTrace[0].taskId) {
          const task = await findTaskById(existingTrace[0].taskId);
          if (task) {
            await db
              .update(tasks)
              .set({ updatedAt: now })
              .where(eq(tasks.id, task.id));
          }
        }
      }
      resourceId = traceId;
    }
  }

  if (event.type === "trace.observation") {
    const traceId = payload.traceId as string;

    if (traceId) {
      const id = nanoid();
      await db.insert(observations).values({
        id,
        traceId,
        parentObservationId: (payload.parentObservationId as string) ?? null,
        type: (payload.type as string) ?? "tool_call",
        name: (payload.name as string) ?? (payload.toolName as string) ?? "observation",
        input: (payload.input as string) ?? null,
        output: (payload.output as string) ?? null,
        model: (payload.model as string) ?? null,
        promptTokens: (payload.promptTokens as number) ?? null,
        completionTokens: (payload.completionTokens as number) ?? null,
        costUsd: (payload.costUsd as number) ?? null,
        toolName: (payload.toolName as string) ?? null,
        startTime: now,
        endTime: payload.durationMs ? now : null,
        durationMs: (payload.durationMs as number) ?? null,
      });
      resourceId = id;
    }
  }

  // --- Message events ---

  if (event.type === "message.sent") {
    const channelId = payload.channelId as string;
    const fromAgentId = event.agentId ?? (payload.fromAgentId as string) ?? "unknown";

    if (channelId) {
      const id = nanoid();
      await db.insert(messages).values({
        id,
        channelId,
        fromAgentId,
        toAgentId: (payload.toAgentId as string) ?? null,
        content: (payload.content as string) ?? "",
        type: (payload.messageType as string) ?? "text",
        metadata: "{}",
        createdAt: now,
      });
      resourceId = id;
    }
  }

  // --- Decision events ---

  if (event.type === "decision.created") {
    const agentId = event.agentId ?? (payload.agentId as string) ?? "unknown";
    const id = nanoid();

    await db.insert(decisions).values({
      id,
      taskId: (payload.taskId as string) ?? null,
      traceId: (payload.traceId as string) ?? null,
      agentId,
      title: (payload.title as string) ?? "Untitled Decision",
      status: "proposed",
      context: (payload.context as string) ?? "",
      decision: (payload.decision as string) ?? "",
      alternatives: (payload.alternatives as string) ?? null,
      consequences: (payload.consequences as string) ?? null,
      createdAt: now,
    });
    resourceId = id;
  }

  // --- Doc events ---

  if (event.type === "doc.generated") {
    const agentId = event.agentId ?? (payload.agentId as string) ?? "unknown";
    const id = nanoid();

    await db.insert(docs).values({
      id,
      taskId: (payload.taskId as string) ?? null,
      agentId,
      type: (payload.type as string) ?? "document",
      title: (payload.title as string) ?? "Untitled",
      content: (payload.content as string) ?? "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    resourceId = id;
  }

  // --- Channel events ---

  if (event.type === "channel.created") {
    const taskId = payload.taskId as string | undefined;
    const channelName = payload.name as string;

    if (channelName) {
      // Check if channel exists for this task
      let existingChannel = null;
      if (taskId) {
        const results = await db
          .select()
          .from(channels)
          .where(eq(channels.taskId, taskId))
          .limit(1);
        existingChannel = results[0] ?? null;
      }

      if (!existingChannel) {
        const id = (payload.channelId as string) ?? nanoid();
        await db.insert(channels).values({
          id,
          name: channelName,
          taskId: taskId ?? null,
          type: (payload.channelType as string) ?? "task",
          createdAt: now,
        });
        resourceId = id;
      } else {
        resourceId = existingChannel.id;
      }
    }
  }

  // --- Always write to events table + broadcast ---

  const eventRecord = {
    id: nanoid(),
    type: event.type,
    actorId: event.agentId ?? "system",
    actorType: event.agentId ? "agent" : ("system" as string),
    resourceType: (payload.resourceType as string) ?? event.type.split(".")[0] ?? "unknown",
    resourceId,
    payload: JSON.stringify(payload),
    integrationId: integrationId ?? null,
    createdAt: now,
  };

  await db.insert(events).values(eventRecord);
  eventBus.broadcast(event);

  return eventRecord;
}
