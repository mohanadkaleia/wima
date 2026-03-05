#!/usr/bin/env node
/**
 * parse-session.ts — Post-hoc Claude Code session JSONL parser.
 *
 * Reads a Claude Code session JSONL file, aggregates token usage and cost,
 * then POSTs a trace.completed event to Wima with real totals.
 *
 * Usage:
 *   npx tsx parse-session.ts <jsonl-path>
 *
 * Environment variables:
 *   WIMA_URL         Base URL (default http://localhost:3002)
 *   WIMA_TOKEN       API token
 *   WIMA_TRACE_ID    Trace ID to complete
 *   WIMA_AGENT_ID    Agent ID
 *
 * Output (stdout): JSON with aggregated stats for use by spawn-agent.sh
 */

import { readFileSync } from "fs";

const BASE_URL = process.env.WIMA_URL || "http://localhost:3002";
const TOKEN = process.env.WIMA_TOKEN || "";
const TRACE_ID = process.env.WIMA_TRACE_ID || "";
const AGENT_ID = process.env.WIMA_AGENT_ID || "";

// Per-model pricing (USD per million tokens)
// Pricing: USD per million tokens (cache read = 0.1x input, cache write = 1.25x input)
const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-4-6":          { input: 3,  output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-sonnet-4-5-20250514": { input: 3,  output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-opus-4-6":            { input: 5,  output: 25, cacheRead: 0.50, cacheWrite: 6.25 },
  "claude-haiku-4-5-20251001":  { input: 1,  output: 5,  cacheRead: 0.10, cacheWrite: 1.25 },
};

const DEFAULT_PRICING = { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 };

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface SessionStats {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  toolCallCount: number;
  costUsd: number;
  messageCount: number;
}

function parseSessionFile(filePath: string): SessionStats {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  let model = "unknown";
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let toolCallCount = 0;
  let messageCount = 0;

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Only process assistant messages (they have usage data)
    if (entry.type !== "assistant") continue;

    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) continue;

    messageCount++;

    // Extract model
    if (message.model && typeof message.model === "string") {
      model = message.model;
    }

    // Extract usage
    const usage = message.usage as Usage | undefined;
    if (usage) {
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
      cacheReadTokens += usage.cache_read_input_tokens ?? 0;
      cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
    }

    // Count tool calls
    const content = message.content as Array<{ type: string }> | undefined;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          toolCallCount++;
        }
      }
    }
  }

  // Calculate cost
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  const costUsd =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheReadTokens / 1_000_000) * pricing.cacheRead +
    (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;

  const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

  return {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    toolCallCount,
    costUsd: Math.round(costUsd * 10000) / 10000, // 4 decimal places
    messageCount,
  };
}

async function postTraceCompleted(stats: SessionStats, durationMs?: number): Promise<void> {
  if (!TRACE_ID || !TOKEN) {
    console.error("parse-session: Missing WIMA_TRACE_ID or WIMA_TOKEN, skipping POST");
    return;
  }

  const payload = {
    events: [
      {
        type: "trace.completed",
        timestamp: Date.now(),
        agentId: AGENT_ID || "unknown",
        payload: {
          resourceType: "trace",
          resourceId: TRACE_ID,
          traceId: TRACE_ID,
          output: `Completed: ${stats.messageCount} messages, ${stats.toolCallCount} tool calls`,
          totalTokens: stats.totalTokens,
          promptTokens: stats.inputTokens + stats.cacheReadTokens + stats.cacheWriteTokens,
          completionTokens: stats.outputTokens,
          costUsd: stats.costUsd,
          model: stats.model,
          ...(durationMs !== undefined ? { durationMs } : {}),
        },
      },
    ],
  };

  try {
    const res = await fetch(`${BASE_URL}/api/v1/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`parse-session: Ingest failed (${res.status}): ${body}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`parse-session: Failed to reach Wima — ${message}`);
  }
}

// --- Main ---

async function main() {
  const jsonlPath = process.argv[2];
  const durationMs = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

  if (!jsonlPath) {
    console.error("Usage: npx tsx parse-session.ts <jsonl-path> [duration-ms]");
    process.exit(1);
  }

  try {
    const stats = parseSessionFile(jsonlPath);

    // Print stats to stdout for spawn-agent.sh to capture
    console.log(JSON.stringify(stats));

    // POST trace.completed to Wima
    await postTraceCompleted(stats, durationMs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`parse-session: Error parsing ${jsonlPath} — ${message}`);
    process.exit(1);
  }
}

main();
