"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  GitBranch,
  ExternalLink,
  FolderOpen,
  Tag,
  User,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const priorityConfig: Record<number, { label: string; className: string }> = {
  3: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  2: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  1: { label: "Medium", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  0: { label: "Low", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statuses = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const priorities = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
  { value: "3", label: "Urgent" },
];

function formatTimestamp(ts: number | null) {
  if (!ts) return "---";
  return new Date(ts).toLocaleString();
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: task, isLoading } = trpc.tasks.getById.useQuery({ id });
  const utils = trpc.useUtils();
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getById.invalidate({ id });
      utils.tasks.list.invalidate();
    },
  });

  const [editingLabels, setEditingLabels] = useState(false);
  const [labelsInput, setLabelsInput] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Board
        </Link>
        <div className="py-20 text-center text-zinc-500">Task not found.</div>
      </div>
    );
  }

  const pri = priorityConfig[task.priority] ?? priorityConfig[0];
  let labels: string[] = [];
  try {
    labels = JSON.parse(task.labels);
  } catch {
    // ignore
  }

  function handleStatusChange(value: string) {
    updateTask.mutate({ id: task!.id, status: value });
  }

  function handlePriorityChange(value: string) {
    updateTask.mutate({ id: task!.id, priority: parseInt(value, 10) });
  }

  function startEditLabels() {
    setLabelsInput(labels.join(", "));
    setEditingLabels(true);
  }

  function saveLabels() {
    const newLabels = labelsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    updateTask.mutate({ id: task!.id, labels: newLabels });
    setEditingLabels(false);
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Board
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-zinc-500">
              {task.identifier}
            </span>
            <Badge
              variant="secondary"
              className="text-xs bg-zinc-800 text-zinc-300"
            >
              {statusLabels[task.status] ?? task.status}
            </Badge>
            <Badge
              className={cn("text-xs px-2 py-0.5 border", pri.className)}
            >
              {pri.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">{task.title}</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">
              Description
            </h2>
            {task.description ? (
              <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic">
                No description provided.
              </p>
            )}
          </div>

          {/* Traces placeholder */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">
              Trace Timeline
            </h2>
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-zinc-600">No traces yet</p>
            </div>
          </div>

          {/* Messages placeholder */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">
              Messages
            </h2>
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-zinc-600">No messages yet</p>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </label>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 w-full h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Priority
              </label>
              <Select
                value={String(task.priority)}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 w-full h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3" />
                Assignee
              </label>
              <p className="text-sm text-zinc-300">
                {task.assigneeAgentId ?? "Unassigned"}
              </p>
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="size-3" />
                Project
              </label>
              <p className="text-sm text-zinc-300">
                {task.projectId ?? "None"}
              </p>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="size-3" />
                Branch
              </label>
              <p className="text-sm text-zinc-300 font-mono">
                {task.branchName ?? "---"}
              </p>
            </div>

            {/* Worktree */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="size-3" />
                Worktree
              </label>
              <p className="text-sm text-zinc-300 font-mono truncate">
                {task.worktreePath ?? "---"}
              </p>
            </div>

            {/* PR URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="size-3" />
                Pull Request
              </label>
              {task.prUrl ? (
                <a
                  href={task.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-400 hover:text-indigo-300 underline break-all"
                >
                  {task.prUrl}
                </a>
              ) : (
                <p className="text-sm text-zinc-300">---</p>
              )}
            </div>

            <Separator className="bg-zinc-800" />

            {/* Labels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="size-3" />
                  Labels
                </label>
                {!editingLabels ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={startEditLabels}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <Pencil className="size-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={saveLabels}
                    className="text-green-500 hover:text-green-300"
                  >
                    <Check className="size-3" />
                  </Button>
                )}
              </div>
              {editingLabels ? (
                <Input
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="bug, frontend (comma-separated)"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveLabels();
                  }}
                />
              ) : labels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No labels</p>
              )}
            </div>

            <Separator className="bg-zinc-800" />

            {/* Timestamps */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Created
                </label>
                <p className="text-xs text-zinc-400">
                  {formatTimestamp(task.createdAt)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Started
                </label>
                <p className="text-xs text-zinc-400">
                  {formatTimestamp(task.startedAt)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="size-3" />
                  Completed
                </label>
                <p className="text-xs text-zinc-400">
                  {formatTimestamp(task.completedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
