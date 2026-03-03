"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CreateDocDialog } from "@/components/create-doc-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Bot,
  Calendar,
  X,
} from "lucide-react";

const typeConfig: Record<string, { label: string; className: string }> = {
  readme: {
    label: "README",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  changelog: {
    label: "Changelog",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  pr_summary: {
    label: "PR Summary",
    className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  architecture: {
    label: "Architecture",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
};

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "readme", label: "README" },
  { value: "changelog", label: "Changelog" },
  { value: "pr_summary", label: "PR Summary" },
  { value: "architecture", label: "Architecture" },
];

type DocItem = {
  id: string;
  title: string;
  type: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  agent: { id: string; name: string } | null;
  task: { id: string; identifier: string; title: string } | null;
};

function DocGroupSection({
  type,
  docs,
}: {
  type: string;
  docs: DocItem[];
}) {
  const [expanded, setExpanded] = useState(true);
  const config = typeConfig[type] ?? {
    label: type,
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-zinc-500" />
        ) : (
          <ChevronRight className="size-4 text-zinc-500" />
        )}
        <Badge
          className={cn("text-[10px] px-1.5 py-0 h-5 border", config.className)}
        >
          {config.label}
        </Badge>
        <span className="text-xs text-zinc-500">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-zinc-800/50">
          {docs.map((doc) => {
            const date = new Date(doc.createdAt);
            return (
              <Link key={doc.id} href={`/docs/${doc.id}`}>
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/30 transition-colors cursor-pointer">
                  <FileText className="size-4 text-zinc-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                      {doc.agent && (
                        <span className="flex items-center gap-1">
                          <Bot className="size-3" />
                          {doc.agent.name}
                        </span>
                      )}
                      {doc.task && (
                        <span className="font-mono text-zinc-600">
                          {doc.task.identifier}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-5 bg-zinc-800 text-zinc-400 border-zinc-700 shrink-0"
                  >
                    v{doc.version}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");

  const agentsQuery = trpc.agents.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();

  const docsQuery = trpc.docs.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    agentId: agentFilter !== "all" ? agentFilter : undefined,
    taskId: taskFilter !== "all" ? taskFilter : undefined,
  });

  const allDocs = (docsQuery.data ?? []) as DocItem[];
  const agentsList = agentsQuery.data ?? [];
  const tasksList = tasksQuery.data ?? [];

  // Group docs by type
  const groupedDocs: Record<string, DocItem[]> = {};
  for (const doc of allDocs) {
    if (!groupedDocs[doc.type]) {
      groupedDocs[doc.type] = [];
    }
    groupedDocs[doc.type].push(doc);
  }

  // Sort groups by a defined order
  const typeOrder = ["readme", "architecture", "changelog", "pr_summary"];
  const sortedTypes = Object.keys(groupedDocs).sort((a, b) => {
    const ia = typeOrder.indexOf(a);
    const ib = typeOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const hasFilters =
    typeFilter !== "all" || agentFilter !== "all" || taskFilter !== "all";

  function clearFilters() {
    setTypeFilter("all");
    setAgentFilter("all");
    setTaskFilter("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Docs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Documentation generated and maintained by agents.
          </p>
        </div>
        <CreateDocDialog />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {typeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-[150px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Agents</SelectItem>
            {agentsList.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-[150px]">
            <SelectValue placeholder="All Tasks" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Tasks</SelectItem>
            {tasksList.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.identifier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-zinc-400 gap-1"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Docs grouped by type */}
      {docsQuery.isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading docs...</div>
      ) : allDocs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-lg">
          <FileText className="size-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-400">
            {hasFilters ? "No docs match your filters" : "No documentation yet"}
          </h3>
          <p className="text-xs text-zinc-600 mt-1">
            {hasFilters
              ? "Try adjusting your filters."
              : "Generate your first document."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTypes.map((type) => (
            <DocGroupSection
              key={type}
              type={type}
              docs={groupedDocs[type]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
