"use client";

import { useState } from "react";
import {
  Wrench,
  Brain,
  ArrowRightLeft,
  MessageSquare,
  Code,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Observation {
  id: string;
  traceId: string;
  parentObservationId: string | null;
  type: string;
  name: string;
  input: string | null;
  output: string | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null;
  toolName: string | null;
  startTime: number;
  endTime: number | null;
  durationMs: number | null;
}

interface TraceTimelineProps {
  observations: Observation[];
  className?: string;
}

const typeIcons: Record<string, typeof Wrench> = {
  tool_call: Wrench,
  generation: Brain,
  handoff: ArrowRightLeft,
  message: MessageSquare,
  code: Code,
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTokens(prompt: number | null, completion: number | null): string | null {
  if (prompt === null && completion === null) return null;
  const total = (prompt ?? 0) + (completion ?? 0);
  return `${total.toLocaleString()} tokens`;
}

function tryFormatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function ObservationNode({
  observation,
  childrenMap,
  depth,
}: {
  observation: Observation;
  childrenMap: Map<string | null, Observation[]>;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [showDetails, setShowDetails] = useState(false);
  const Icon = typeIcons[observation.type] ?? Code;
  const tokens = formatTokens(observation.promptTokens, observation.completionTokens);
  const children = childrenMap.get(observation.id) ?? [];
  const hasChildren = children.length > 0;
  const hasIO = observation.input || observation.output;

  return (
    <div className={cn("relative", depth > 0 && "ml-6")}>
      {depth > 0 && (
        <div className="absolute -left-3 top-0 h-full w-px bg-zinc-800" />
      )}
      <div
        className={cn(
          "group flex items-start gap-3 rounded-md px-3 py-2 transition-colors",
          (hasIO || hasChildren) && "cursor-pointer hover:bg-zinc-900/50"
        )}
        onClick={() => {
          if (hasIO) setShowDetails(!showDetails);
        }}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400">
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="shrink-0 text-zinc-500 hover:text-zinc-300"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <span className="truncate text-sm font-medium text-zinc-200">
              {observation.name}
            </span>
            {observation.model && (
              <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                {observation.model}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {observation.durationMs !== null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(observation.durationMs)}
              </span>
            )}
            {tokens && (
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {tokens}
              </span>
            )}
            {observation.costUsd !== null && (
              <span>${observation.costUsd.toFixed(4)}</span>
            )}
          </div>
        </div>
      </div>

      {showDetails && hasIO && (
        <div className="ml-9 mb-2 space-y-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
          {observation.input && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Input
              </p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">
                {tryFormatJson(observation.input)}
              </pre>
            </div>
          )}
          {observation.output && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Output
              </p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">
                {tryFormatJson(observation.output)}
              </pre>
            </div>
          )}
        </div>
      )}

      {expanded &&
        children.map((child) => (
          <ObservationNode
            key={child.id}
            observation={child}
            childrenMap={childrenMap}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function TraceTimeline({ observations, className }: TraceTimelineProps) {
  const childrenMap = new Map<string | null, Observation[]>();
  for (const obs of observations) {
    const parentId = obs.parentObservationId ?? null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(obs);
  }

  const roots = childrenMap.get(null) ?? [];

  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-950 p-4", className)}>
      {roots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <Brain className="mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm">No observations recorded</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {roots.map((root) => (
            <ObservationNode
              key={root.id}
              observation={root}
              childrenMap={childrenMap}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
