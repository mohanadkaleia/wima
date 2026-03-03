"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, Bot, Calendar } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  proposed: {
    label: "Proposed",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  superseded: {
    label: "Superseded",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

interface DecisionCardProps {
  decision: {
    id: string;
    title: string;
    status: string;
    createdAt: number;
    agent: { id: string; name: string } | null;
    task: { id: string; identifier: string; title: string } | null;
  };
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const status = statusConfig[decision.status] ?? statusConfig.proposed;
  const date = new Date(decision.createdAt);

  return (
    <Link href={`/decisions/${decision.id}`}>
      <div className="group rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 text-zinc-500 shrink-0" />
            <h3 className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
              {decision.title}
            </h3>
          </div>
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 border shrink-0",
              status.className
            )}
          >
            {status.label}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
          {decision.agent && (
            <span className="flex items-center gap-1">
              <Bot className="size-3" />
              {decision.agent.name}
            </span>
          )}
          {decision.task && (
            <span className="font-mono text-zinc-600">
              {decision.task.identifier}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="size-3" />
            {date.toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
