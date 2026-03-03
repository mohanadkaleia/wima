/**
 * OpenClaw Adapter
 *
 * Translates OpenClaw data formats into Wima ingest events.
 */

export interface OpenClawTask {
  slug: string;
  description: string;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
}

export interface OpenClawTasksJson {
  version?: number;
  maxRunning?: number;
  pending: OpenClawTask[];
  running: OpenClawTask[];
  completed: OpenClawTask[];
  failed: OpenClawTask[];
}

export interface IngestEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  payload: Record<string, unknown>;
}

export interface Observation {
  type: string;
  toolName: string;
  input?: string;
  output?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// parseTasksJson
// ---------------------------------------------------------------------------

export function parseTasksJson(tasksJson: OpenClawTasksJson): IngestEvent[] {
  const events: IngestEvent[] = [];

  for (const task of tasksJson.pending ?? []) {
    events.push({
      type: "task.created",
      timestamp: task.startedAt ? new Date(task.startedAt).getTime() : Date.now(),
      payload: {
        resourceType: "task",
        resourceId: task.slug,
        slug: task.slug,
        description: task.description,
        status: "backlog",
      },
    });
  }

  for (const task of tasksJson.running ?? []) {
    events.push({
      type: "task.updated",
      timestamp: task.startedAt ? new Date(task.startedAt).getTime() : Date.now(),
      payload: {
        resourceType: "task",
        resourceId: task.slug,
        slug: task.slug,
        description: task.description,
        status: "in_progress",
        startedAt: task.startedAt,
      },
    });
  }

  for (const task of tasksJson.completed ?? []) {
    events.push({
      type: "task.completed",
      timestamp: task.completedAt ? new Date(task.completedAt).getTime() : Date.now(),
      payload: {
        resourceType: "task",
        resourceId: task.slug,
        slug: task.slug,
        description: task.description,
        status: "done",
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        summary: task.summary,
      },
    });
  }

  for (const task of tasksJson.failed ?? []) {
    events.push({
      type: "task.updated",
      timestamp: task.completedAt
        ? new Date(task.completedAt).getTime()
        : task.startedAt
          ? new Date(task.startedAt).getTime()
          : Date.now(),
      payload: {
        resourceType: "task",
        resourceId: task.slug,
        slug: task.slug,
        description: task.description,
        status: "failed",
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        summary: task.summary,
      },
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// parseClaudeCodeOutput
// ---------------------------------------------------------------------------

const TOOL_PATTERN = /^⏺\s+(Read|Write|Edit|Bash|Grep|Glob|WebFetch|WebSearch|NotebookEdit|Skill|EnterWorktree)(?:\s*\(([^)]*)\))?(?:\s+(.*))?$/;
const FILE_PATH_PATTERN = /(?:^|\s)((?:\/|~\/|\.\/)[^\s]+)/;
const TOKEN_USAGE_PATTERN = /(?:Total tokens|Tokens used|Input tokens|Output tokens|Cost):\s*(.+)/i;
const COMMAND_OUTPUT_PATTERN = /^\s{2,}\$\s+(.+)$/;

export function parseClaudeCodeOutput(rawLog: string): Observation[] {
  const observations: Observation[] = [];
  const lines = rawLog.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match tool invocations: "⏺ ToolName"
    const toolMatch = line.match(TOOL_PATTERN);
    if (toolMatch) {
      const toolName = toolMatch[1];
      const toolArg = toolMatch[2] || toolMatch[3] || "";

      // Gather subsequent indented lines as output
      let output = "";
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^\s{2,}/) && !lines[j].match(TOOL_PATTERN)) {
        output += lines[j].trimStart() + "\n";
        j++;
      }

      observations.push({
        type: "tool_call",
        toolName,
        input: toolArg.trim() || undefined,
        output: output.trim() || undefined,
        timestamp: Date.now(),
      });
      continue;
    }

    // Match file paths standalone
    const fileMatch = line.match(FILE_PATH_PATTERN);
    if (fileMatch && !line.match(TOOL_PATTERN)) {
      // Skip if already captured as part of a tool call
      continue;
    }

    // Match token usage summaries
    const tokenMatch = line.match(TOKEN_USAGE_PATTERN);
    if (tokenMatch) {
      observations.push({
        type: "token_usage",
        toolName: "system",
        input: tokenMatch[0].trim(),
        timestamp: Date.now(),
      });
      continue;
    }

    // Match command outputs (indented with $)
    const cmdMatch = line.match(COMMAND_OUTPUT_PATTERN);
    if (cmdMatch) {
      observations.push({
        type: "command",
        toolName: "Bash",
        input: cmdMatch[1].trim(),
        timestamp: Date.now(),
      });
    }
  }

  return observations;
}

// ---------------------------------------------------------------------------
// mapOpenClawStatus
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, string> = {
  pending: "idle",
  running: "running",
  completed: "idle",
  failed: "error",
};

export function mapOpenClawStatus(status: string): string {
  return STATUS_MAP[status] ?? "idle";
}
