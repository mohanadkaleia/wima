"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DecisionCard } from "@/components/decision-card";
import { CreateDecisionDialog } from "@/components/create-decision-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, FileText, X } from "lucide-react";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Accepted" },
  { value: "superseded", label: "Superseded" },
  { value: "deprecated", label: "Deprecated" },
];

export default function DecisionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");

  const agentsQuery = trpc.agents.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();

  const decisionsQuery = trpc.decisions.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    agentId: agentFilter !== "all" ? agentFilter : undefined,
    taskId: taskFilter !== "all" ? taskFilter : undefined,
    search: search.trim() || undefined,
  });

  const decisions = decisionsQuery.data ?? [];
  const agentsList = agentsQuery.data ?? [];
  const tasksList = tasksQuery.data ?? [];

  const hasFilters =
    statusFilter !== "all" ||
    agentFilter !== "all" ||
    taskFilter !== "all" ||
    search.trim() !== "";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setAgentFilter("all");
    setTaskFilter("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Decisions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Architectural Decision Records tracked by agents.
          </p>
        </div>
        <CreateDecisionDialog />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions..."
            className="bg-zinc-900 border-zinc-800 text-zinc-100 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
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

      {/* Decision list */}
      {decisionsQuery.isLoading ? (
        <div className="text-center py-12 text-zinc-500">
          Loading decisions...
        </div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-lg">
          <FileText className="size-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-400">
            {hasFilters ? "No decisions match your filters" : "No decisions yet"}
          </h3>
          <p className="text-xs text-zinc-600 mt-1">
            {hasFilters
              ? "Try adjusting your search or filters."
              : "Create your first Architecture Decision Record."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  );
}
