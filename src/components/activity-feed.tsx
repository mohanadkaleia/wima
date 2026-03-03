"use client";

import {
  ListTodo,
  Bot,
  Wrench,
  MessageSquare,
  GitBranch,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  type: string;
  actorId: string;
  actorType: string;
  resourceType: string;
  resourceId: string;
  payload: string;
  integrationId: string | null;
  createdAt: number;
}

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEventIcon(type: string) {
  if (type.startsWith("task.")) return ListTodo;
  if (type.startsWith("agent.")) return Bot;
  if (type.startsWith("trace.")) return Wrench;
  if (type.startsWith("message.")) return MessageSquare;
  if (type.startsWith("decision.")) return GitBranch;
  return Activity;
}

function getEventColor(type: string) {
  if (type.startsWith("task.")) return "text-blue-400 bg-blue-400/10";
  if (type.startsWith("agent.")) return "text-emerald-400 bg-emerald-400/10";
  if (type.startsWith("trace.")) return "text-amber-400 bg-amber-400/10";
  if (type.startsWith("message.")) return "text-violet-400 bg-violet-400/10";
  if (type.startsWith("decision.")) return "text-rose-400 bg-rose-400/10";
  return "text-zinc-400 bg-zinc-400/10";
}

function formatEventDescription(event: EventItem): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(event.payload);
  } catch {
    // ignore
  }

  switch (event.type) {
    case "task.created":
      return `Task ${event.resourceId} created${parsed.title ? `: ${parsed.title}` : ""}`;
    case "task.updated":
      return `Task ${event.resourceId} updated${parsed.status ? ` → ${parsed.status}` : ""}`;
    case "agent.started":
      return `${event.actorId} started working on ${event.resourceId}`;
    case "agent.stopped":
      return `${event.actorId} stopped working`;
    case "agent.idle":
      return `${event.actorId} is now idle`;
    case "trace.observation":
      return `Tool call: ${parsed.toolName || parsed.name || "unknown"}${parsed.taskId ? ` (${parsed.taskId})` : ""}`;
    case "trace.created":
      return `New trace: ${parsed.name || event.resourceId}`;
    case "message.sent":
      return `Message in #${parsed.channelName || event.resourceId}`;
    case "decision.created":
      return `New decision: ${parsed.title || event.resourceId}`;
    case "decision.accepted":
      return `Decision accepted: ${parsed.title || event.resourceId}`;
    case "doc.created":
      return `Document created: ${parsed.title || event.resourceId}`;
    case "doc.updated":
      return `Document updated: ${parsed.title || event.resourceId}`;
    default:
      return `${event.type} on ${event.resourceType}/${event.resourceId}`;
  }
}

interface ActivityFeedProps {
  events: EventItem[];
  className?: string;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-zinc-500", className)}>
        <Activity className="mb-3 h-8 w-8" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-0", className)}>
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />

      {events.map((event, index) => {
        const Icon = getEventIcon(event.type);
        const colorClass = getEventColor(event.type);
        const isNew = index === 0;

        return (
          <div
            key={event.id}
            className={cn(
              "relative flex items-start gap-4 py-3 pl-2 pr-2 transition-colors",
              isNew && "animate-in fade-in slide-in-from-top-2 duration-300"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                colorClass
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-200 leading-snug">
                {formatEventDescription(event)}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                <span>{event.actorId}</span>
                <span>&middot;</span>
                <span>{getRelativeTime(event.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
