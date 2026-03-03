"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityConfig: Record<
  number,
  { label: string; className: string }
> = {
  3: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  2: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  1: { label: "Medium", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  0: { label: "Low", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

interface TaskCardProps {
  task: {
    id: string;
    identifier: string;
    title: string;
    priority: number;
    status: string;
    assigneeAgentId: string | null;
    labels: string;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  const priority = priorityConfig[task.priority] ?? priorityConfig[0];
  let labels: string[] = [];
  try {
    labels = JSON.parse(task.labels);
  } catch {
    // ignore
  }

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="group rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80 cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-mono text-zinc-500">
            {task.identifier}
          </span>
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 border",
              priority.className
            )}
          >
            {priority.label}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
          {task.title}
        </p>
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {labels.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-400 border-zinc-700"
            >
              {label}
            </Badge>
          ))}
          {task.assigneeAgentId && (
            <span className="ml-auto text-[10px] text-zinc-500 truncate max-w-[100px]">
              {task.assigneeAgentId}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
