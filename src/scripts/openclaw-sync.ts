#!/usr/bin/env npx tsx
/**
 * OpenClaw Sync Script
 *
 * Run via: npx tsx src/scripts/openclaw-sync.ts
 *
 * Environment variables:
 *   OPENCLAW_TASKS_PATH  — path to tasks.json (default: ~/.openclaw/workspace/memory/tasks.json)
 *   WIMA_URL         — Wima base URL (default: http://localhost:3000)
 *   WIMA_API_TOKEN   — integration API token (required)
 *   POLL_INTERVAL_MS     — polling interval in ms (default: 10000)
 */

import { resolve } from "node:path";
import { homedir } from "node:os";
import { OpenClawPoller } from "../server/adapters/openclaw-poller";

const tasksPath =
  process.env.OPENCLAW_TASKS_PATH ||
  resolve(homedir(), ".openclaw/workspace/memory/tasks.json");

const baseUrl = process.env.WIMA_URL || "http://localhost:3000";
const apiToken = process.env.WIMA_API_TOKEN;
const pollInterval = Number(process.env.POLL_INTERVAL_MS) || 10_000;

if (!apiToken) {
  console.error(
    "Error: WIMA_API_TOKEN is required.\n\n" +
      "Usage:\n" +
      "  WIMA_API_TOKEN=<token> npx tsx src/scripts/openclaw-sync.ts\n\n" +
      "Environment variables:\n" +
      "  OPENCLAW_TASKS_PATH  — path to tasks.json\n" +
      "  WIMA_URL         — Wima base URL (default: http://localhost:3000)\n" +
      "  WIMA_API_TOKEN   — integration API token (required)\n" +
      "  POLL_INTERVAL_MS     — polling interval in ms (default: 10000)"
  );
  process.exit(1);
}

const poller = new OpenClawPoller({
  tasksJsonPath: tasksPath,
  pollIntervalMs: pollInterval,
  ingestUrl: `${baseUrl}/api/v1/ingest`,
  apiToken,
});

console.log("[openclaw-sync] Starting OpenClaw sync...");
poller.start();

function shutdown() {
  console.log("\n[openclaw-sync] Shutting down gracefully...");
  poller.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
