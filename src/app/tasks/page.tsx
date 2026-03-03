"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "@/components/task-card";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { trpc } from "@/lib/trpc";
import { useSSE } from "@/hooks/use-sse";
import { useState } from "react";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
] as const;

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

export default function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const queryInput: { status?: string; priority?: number } = {};
  if (filterStatus !== "all") queryInput.status = filterStatus;
  if (filterPriority !== "all") queryInput.priority = parseInt(filterPriority, 10);

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery(
    Object.keys(queryInput).length > 0 ? queryInput : undefined
  );

  const utils = trpc.useUtils();
  const { events } = useSSE();

  // Invalidate on SSE events
  useEffect(() => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    if (
      last.type === "task.created" ||
      last.type === "task.updated" ||
      last.type === "task.completed"
    ) {
      utils.tasks.list.invalidate();
    }
  }, [events, utils.tasks.list]);

  const tasksByStatus = (status: string) =>
    (tasks ?? []).filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Task Board</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage and track tasks across your agent fleet.
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Statuses</SelectItem>
                {COLUMNS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="3">Urgent</SelectItem>
                <SelectItem value="2">High</SelectItem>
                <SelectItem value="1">Medium</SelectItem>
                <SelectItem value="0">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="kanban" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
              <LayoutGrid className="size-3.5" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs gap-1.5 data-[state=active]:bg-zinc-800">
              <List className="size-3.5" />
              List
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Kanban View */}
        <TabsContent value="kanban">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((col) => {
                const columnTasks = tasksByStatus(col.key);
                return (
                  <div
                    key={col.key}
                    className="flex-shrink-0 w-[280px]"
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-sm font-medium text-zinc-300">
                        {col.label}
                      </span>
                      <span className="text-xs text-zinc-600 bg-zinc-800 rounded-full px-2 py-0.5">
                        {columnTasks.length}
                      </span>
                    </div>
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="space-y-2 pr-2">
                        {columnTasks.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
                            <p className="text-xs text-zinc-600">
                              No tasks
                            </p>
                          </div>
                        ) : (
                          columnTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(tasks ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-zinc-500 text-sm"
                      >
                        No tasks found. Create your first task to get started.
                      </td>
                    </tr>
                  ) : (
                    (tasks ?? []).map((task) => {
                      const pri =
                        priorityConfig[task.priority] ?? priorityConfig[0];
                      return (
                        <tr
                          key={task.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
                            >
                              {task.identifier}
                            </Link>
                          </td>
                          <td className="py-2.5 px-4">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-zinc-200 hover:text-white font-medium"
                            >
                              {task.title}
                            </Link>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-zinc-800 text-zinc-400"
                            >
                              {statusLabels[task.status] ?? task.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-5 border",
                                pri.className
                              )}
                            >
                              {pri.label}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-zinc-500">
                            {task.assigneeAgentId ?? "Unassigned"}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-zinc-500">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
