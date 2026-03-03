"use client";

import {
  ListTodo,
  Bot,
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/activity-feed";
import { trpc } from "@/lib/trpc";
import { useSSE } from "@/hooks/use-sse";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  backlog: "#71717a",
  todo: "#a1a1aa",
  in_progress: "#6366f1",
  in_review: "#f59e0b",
  done: "#22c55e",
};

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-zinc-400 text-sm font-medium">
          {title}
        </CardDescription>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${iconColor}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function TaskStatusChart({
  byStatus,
}: {
  byStatus: Record<string, number>;
}) {
  const data = Object.entries(byStatus).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
    color: STATUS_COLORS[status] || "#71717a",
  }));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">
        No tasks yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e4e4e7",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CostOverTimeChart({
  data,
}: {
  data: { day: string; cost: number; tokens: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">
        No cost data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          stroke="#52525b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          stroke="#52525b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e4e4e7",
          }}
          formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(4)}`, "Cost"]}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#6366f1"
          fill="url(#costGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } =
    trpc.dashboard.stats.useQuery();
  const { data: costData, isLoading: costLoading } =
    trpc.dashboard.costOverTime.useQuery();
  const { data: recentEvents, isLoading: eventsLoading } =
    trpc.dashboard.recentEvents.useQuery(undefined, {
      refetchInterval: 10000,
    });

  const { events: sseEvents, connected } = useSSE();

  // Merge SSE events with DB events for real-time feed
  const mergedEvents = (() => {
    const dbEvents = recentEvents ?? [];
    const sseAsEvents = sseEvents
      .filter((e) => e.type && e.payload)
      .map((e, i) => ({
        id: `sse-${i}-${e.timestamp}`,
        type: e.type,
        actorId: e.agentId || "system",
        actorType: e.agentId ? "agent" : "system",
        resourceType: e.type.split(".")[0] || "unknown",
        resourceId: String(e.payload.resourceId || e.payload.id || ""),
        payload: JSON.stringify(e.payload),
        integrationId: null,
        createdAt: e.timestamp,
      }));

    // Put SSE events first (newest), then DB events, dedupe by removing DB events that overlap
    const all = [...sseAsEvents.reverse(), ...dbEvents];
    const seen = new Set<string>();
    return all.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    }).slice(0, 20);
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time overview of your AI agent fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-600"}`}
          />
          <span className="text-xs text-zinc-500">
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="py-6">
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-zinc-800" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-800" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Tasks"
              value={stats?.taskCounts.total ?? 0}
              subtitle={`${stats?.taskCounts.active ?? 0} active, ${stats?.taskCounts.completed ?? 0} completed`}
              icon={ListTodo}
              iconColor="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              title="Active Agents"
              value={stats?.agentCounts.total ?? 0}
              subtitle={`${stats?.agentCounts.running ?? 0} running, ${stats?.agentCounts.idle ?? 0} idle`}
              icon={Bot}
              iconColor="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              title="Total Cost"
              value={formatCost(stats?.totalCost ?? 0)}
              subtitle="Across all traces"
              icon={DollarSign}
              iconColor="bg-amber-500/10 text-amber-400"
            />
            <StatCard
              title="Total Tokens"
              value={formatTokens(stats?.totalTokens ?? 0)}
              subtitle="Prompt + completion tokens"
              icon={Zap}
              iconColor="bg-violet-500/10 text-violet-400"
            />
          </>
        )}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <div className="h-32 w-32 animate-pulse rounded-full bg-zinc-800" />
              </div>
            ) : (
              <>
                <TaskStatusChart
                  byStatus={stats?.taskCounts.byStatus ?? {}}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  {Object.entries(stats?.taskCounts.byStatus ?? {}).map(
                    ([status, count]) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[status] || "#71717a",
                          }}
                        />
                        <span className="text-xs text-zinc-400">
                          {status.replace("_", " ")} ({count})
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">
              Cost Over Time
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {costLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <div className="h-full w-full animate-pulse rounded bg-zinc-800" />
              </div>
            ) : (
              <CostOverTimeChart data={costData ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Activity Feed */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Activity Feed
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Latest events across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ActivityFeed events={mergedEvents} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
