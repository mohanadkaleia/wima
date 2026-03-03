/**
 * OpenClaw Polling Worker
 *
 * Periodically polls OpenClaw's tasks.json file and posts
 * delta events to the SwarmOps ingest API.
 */

import { readFile } from "node:fs/promises";
import { parseTasksJson, type OpenClawTasksJson, type IngestEvent } from "./openclaw";

export interface OpenClawPollerConfig {
  /** Path to OpenClaw tasks.json, e.g. ~/.openclaw/workspace/memory/tasks.json */
  tasksJsonPath: string;
  /** Polling interval in ms (default 10000) */
  pollIntervalMs?: number;
  /** SwarmOps ingest URL, e.g. http://localhost:3000/api/v1/ingest */
  ingestUrl: string;
  /** Integration API token */
  apiToken: string;
}

export class OpenClawPoller {
  private config: Required<OpenClawPollerConfig>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private seenSlugs: Map<string, string> = new Map(); // slug -> last known status
  private lastRawJson: string = "";

  constructor(config: OpenClawPollerConfig) {
    this.config = {
      ...config,
      pollIntervalMs: config.pollIntervalMs ?? 10_000,
    };
  }

  start(): void {
    if (this.timer) return;
    console.log(
      `[openclaw-poller] Starting — polling every ${this.config.pollIntervalMs}ms`
    );
    console.log(`[openclaw-poller] tasks.json: ${this.config.tasksJsonPath}`);
    console.log(`[openclaw-poller] ingest URL: ${this.config.ingestUrl}`);

    // Run first poll immediately
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.config.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[openclaw-poller] Stopped");
    }
  }

  async poll(): Promise<void> {
    try {
      const raw = await readFile(this.config.tasksJsonPath, "utf-8");

      // Skip if file hasn't changed
      if (raw === this.lastRawJson) return;
      this.lastRawJson = raw;

      const tasksJson: OpenClawTasksJson = JSON.parse(raw);
      const allEvents = parseTasksJson(tasksJson);

      // Filter to only new or changed tasks
      const newEvents = this.filterNewEvents(allEvents, tasksJson);

      if (newEvents.length === 0) return;

      console.log(`[openclaw-poller] Sending ${newEvents.length} event(s)`);

      await this.postEvents(newEvents);

      // Update seen state
      this.updateSeenState(tasksJson);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist yet — not an error
        return;
      }
      console.error("[openclaw-poller] Poll error:", err);
    }
  }

  private filterNewEvents(
    allEvents: IngestEvent[],
    tasksJson: OpenClawTasksJson
  ): IngestEvent[] {
    const newEvents: IngestEvent[] = [];

    const statusGroups: Array<[string, OpenClawTasksJson[keyof OpenClawTasksJson]]> = [
      ["backlog", tasksJson.pending],
      ["in_progress", tasksJson.running],
      ["done", tasksJson.completed],
      ["failed", tasksJson.failed],
    ];

    for (const [status, tasks] of statusGroups) {
      if (!Array.isArray(tasks)) continue;
      for (const task of tasks) {
        if (typeof task === "object" && task !== null && "slug" in task) {
          const t = task as { slug: string };
          const lastStatus = this.seenSlugs.get(t.slug);
          if (lastStatus !== status) {
            // Find matching event
            const matchingEvent = allEvents.find(
              (e) => (e.payload.slug as string) === t.slug && (e.payload.status as string) === status
            );
            if (matchingEvent) {
              newEvents.push(matchingEvent);
            }
          }
        }
      }
    }

    return newEvents;
  }

  private updateSeenState(tasksJson: OpenClawTasksJson): void {
    for (const task of tasksJson.pending ?? []) {
      this.seenSlugs.set(task.slug, "backlog");
    }
    for (const task of tasksJson.running ?? []) {
      this.seenSlugs.set(task.slug, "in_progress");
    }
    for (const task of tasksJson.completed ?? []) {
      this.seenSlugs.set(task.slug, "done");
    }
    for (const task of tasksJson.failed ?? []) {
      this.seenSlugs.set(task.slug, "failed");
    }
  }

  private async postEvents(events: IngestEvent[]): Promise<void> {
    const res = await fetch(this.config.ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiToken}`,
      },
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[openclaw-poller] Ingest failed (${res.status}): ${body}`);
    } else {
      const data = (await res.json()) as { received: number };
      console.log(`[openclaw-poller] Ingested ${data.received} event(s)`);
    }
  }
}
