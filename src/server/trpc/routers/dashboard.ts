import { sql, desc, gte } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { tasks, agents, traces, events } from "@/server/db/schema";

export const dashboardRouter = router({
  stats: publicProcedure.query(async ({ ctx }) => {
    // Task counts
    const allTasks = await ctx.db.select({ status: tasks.status }).from(tasks);
    const byStatus: Record<string, number> = {};
    for (const t of allTasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }
    const active = (byStatus["in_progress"] || 0) + (byStatus["in_review"] || 0);
    const completed = byStatus["done"] || 0;

    // Agent counts
    const allAgents = await ctx.db
      .select({ status: agents.status })
      .from(agents);
    const agentByStatus: Record<string, number> = {};
    for (const a of allAgents) {
      agentByStatus[a.status] = (agentByStatus[a.status] || 0) + 1;
    }

    // Cost and tokens
    const costResult = await ctx.db
      .select({
        totalCost: sql<number>`coalesce(sum(${traces.costUsd}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${traces.totalTokens}), 0)`,
      })
      .from(traces);

    return {
      taskCounts: {
        total: allTasks.length,
        active,
        completed,
        byStatus,
      },
      agentCounts: {
        total: allAgents.length,
        running: agentByStatus["running"] || 0,
        idle: agentByStatus["idle"] || 0,
        error: agentByStatus["error"] || 0,
      },
      totalCost: costResult[0]?.totalCost ?? 0,
      totalTokens: costResult[0]?.totalTokens ?? 0,
    };
  }),

  costOverTime: publicProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const rows = await ctx.db
      .select({
        day: sql<string>`date(${traces.startTime} / 1000, 'unixepoch')`,
        cost: sql<number>`coalesce(sum(${traces.costUsd}), 0)`,
        tokens: sql<number>`coalesce(sum(${traces.totalTokens}), 0)`,
      })
      .from(traces)
      .where(gte(traces.startTime, thirtyDaysAgo))
      .groupBy(sql`date(${traces.startTime} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${traces.startTime} / 1000, 'unixepoch')`);

    return rows;
  }),

  recentEvents: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(events)
      .orderBy(desc(events.createdAt))
      .limit(20);

    return rows;
  }),
});
