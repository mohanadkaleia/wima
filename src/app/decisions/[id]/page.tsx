"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  LinkIcon,
  Calendar,
  Activity,
  CheckCircle,
  ArchiveIcon,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
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

export default function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const decisionQuery = trpc.decisions.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const updateStatus = trpc.decisions.updateStatus.useMutation({
    onSuccess: () => {
      utils.decisions.getById.invalidate({ id });
      utils.decisions.list.invalidate();
    },
  });

  const decision = decisionQuery.data;

  if (decisionQuery.isLoading) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Loading decision...
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-zinc-300">
          Decision not found
        </h2>
        <Link
          href="/decisions"
          className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
        >
          Back to decisions
        </Link>
      </div>
    );
  }

  const status = statusConfig[decision.status] ?? statusConfig.proposed;
  const date = new Date(decision.createdAt);

  // Build the MADR-style markdown
  const sections: string[] = [];

  sections.push(`## Context\n\n${decision.context}`);
  sections.push(`## Decision\n\n${decision.decision}`);

  if (decision.alternatives) {
    sections.push(
      `## Alternatives Considered\n\n${decision.alternatives}`
    );
  }
  if (decision.consequences) {
    sections.push(`## Consequences\n\n${decision.consequences}`);
  }

  const fullMarkdown = sections.join("\n\n---\n\n");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/decisions"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to decisions
      </Link>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">{decision.title}</h1>
        <Badge
          className={cn(
            "text-xs px-2 py-0.5 h-6 border shrink-0",
            status.className
          )}
        >
          {status.label}
        </Badge>
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-400 border border-zinc-800 rounded-lg bg-zinc-900/50 px-4 py-3">
        {decision.agent && (
          <span className="flex items-center gap-1.5">
            <Bot className="size-4 text-zinc-500" />
            {decision.agent.name}
          </span>
        )}
        {decision.task && (
          <Link
            href={`/tasks/${decision.task.id}`}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
          >
            <LinkIcon className="size-4" />
            {decision.task.identifier}
          </Link>
        )}
        {decision.trace && (
          <span className="flex items-center gap-1.5">
            <Activity className="size-4 text-zinc-500" />
            Trace: {decision.trace.name}
          </span>
        )}
        <span className="flex items-center gap-1.5 ml-auto">
          <Calendar className="size-4 text-zinc-500" />
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Status controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 mr-1">Change status:</span>
        {decision.status === "proposed" && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1 border-green-800 text-green-400 hover:bg-green-500/10"
            onClick={() => updateStatus.mutate({ id, status: "accepted" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle className="size-3" />
            Accept
          </Button>
        )}
        {decision.status === "accepted" && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            onClick={() => updateStatus.mutate({ id, status: "superseded" })}
            disabled={updateStatus.isPending}
          >
            <ArchiveIcon className="size-3" />
            Supersede
          </Button>
        )}
        {(decision.status === "proposed" || decision.status === "accepted") && (
          <Button
            size="xs"
            variant="outline"
            className="gap-1 border-red-800 text-red-400 hover:bg-red-500/10"
            onClick={() => updateStatus.mutate({ id, status: "deprecated" })}
            disabled={updateStatus.isPending}
          >
            Deprecate
          </Button>
        )}
      </div>

      {/* MADR content */}
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 p-6 md:p-8">
        <MarkdownRenderer content={fullMarkdown} />
      </div>
    </div>
  );
}
