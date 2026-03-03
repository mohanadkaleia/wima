"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Coins,
  Hash,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { AgentStatus } from "@/components/agent-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDuration(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUptime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

interface StatCardProps {
  icon: typeof Activity;
  label: string;
  value: string;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-lg font-semibold text-zinc-100">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = trpc.agents.getById.useQuery({ id });

  if (agent.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!agent.data) {
    return (
      <div className="space-y-4">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Fleet
          </Button>
        </Link>
        <p className="text-zinc-400">Agent not found.</p>
      </div>
    );
  }

  const a = agent.data;
  const recentTraces = a.recentTraces ?? [];
  const stats = a.stats ?? { totalTasks: 0, totalTokens: 0, totalCost: 0 };

  // Build chart data from traces
  const tokenChartData = recentTraces
    .filter((t) => t.totalTokens !== null)
    .slice(0, 20)
    .reverse()
    .map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
      tokens: t.totalTokens ?? 0,
      time: formatDate(t.startTime),
    }));

  const costChartData = recentTraces
    .filter((t) => t.costUsd !== null)
    .slice(0, 15)
    .reverse()
    .map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
      cost: t.costUsd ?? 0,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-100">{a.name}</h1>
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
            {a.type}
          </Badge>
          <AgentStatus status={a.status} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Hash}
          label="Tasks Completed"
          value={stats.totalTasks.toLocaleString()}
        />
        <StatCard
          icon={Activity}
          label="Total Tokens"
          value={stats.totalTokens.toLocaleString()}
        />
        <StatCard
          icon={Coins}
          label="Total Cost"
          value={`$${stats.totalCost.toFixed(2)}`}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={formatUptime(a.createdAt)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Token usage chart */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tokenChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={tokenChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-zinc-500">
                No token data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost breakdown chart */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={costChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#3f3f46" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#3f3f46" }}
                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, "Cost"]}
                  />
                  <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-zinc-500">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task history table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Task History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTraces.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                    <th className="pb-3 pr-4">Trace</th>
                    <th className="pb-3 pr-4">Task</th>
                    <th className="pb-3 pr-4">Duration</th>
                    <th className="pb-3 pr-4">Tokens</th>
                    <th className="pb-3 pr-4">Cost</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {recentTraces.map((trace) => (
                    <tr
                      key={trace.id}
                      className="text-zinc-300 transition-colors hover:bg-zinc-800/30"
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium">{trace.name}</span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">
                        {trace.taskId ?? "--"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                        {formatDuration(trace.durationMs)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                        {trace.totalTokens?.toLocaleString() ?? "--"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                        {trace.costUsd !== null
                          ? `$${trace.costUsd.toFixed(4)}`
                          : "--"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={
                            trace.endTime
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }
                        >
                          {trace.endTime ? "Completed" : "Running"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {trace.taskId && (
                          <Link href={`/tasks/${trace.taskId}`}>
                            <Button variant="ghost" size="icon-xs">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
              No task history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
