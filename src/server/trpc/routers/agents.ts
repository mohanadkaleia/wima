import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { agents, tasks, traces } from "@/server/db/schema";

export const agentsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const agentRows = await ctx.db
      .select()
      .from(agents)
      .orderBy(desc(agents.createdAt));

    const result = await Promise.all(
      agentRows.map(async (agent) => {
        const currentTask = agent.currentTaskId
          ? await ctx.db
              .select()
              .from(tasks)
              .where(eq(tasks.id, agent.currentTaskId))
              .limit(1)
              .then((r) => r[0] ?? null)
          : null;

        const costResult = await ctx.db
          .select({ totalCost: sql<number>`COALESCE(SUM(${traces.costUsd}), 0)` })
          .from(traces)
          .where(eq(traces.agentId, agent.id));

        return {
          ...agent,
          currentTask,
          totalCost: costResult[0]?.totalCost ?? 0,
        };
      })
    );

    return result;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      const agent = result[0] ?? null;
      if (!agent) return null;

      const currentTask = agent.currentTaskId
        ? await ctx.db
            .select()
            .from(tasks)
            .where(eq(tasks.id, agent.currentTaskId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      const recentTraces = await ctx.db
        .select()
        .from(traces)
        .where(eq(traces.agentId, input.id))
        .orderBy(desc(traces.startTime))
        .limit(50);

      const stats = await ctx.db
        .select({
          totalTasks: sql<number>`COUNT(*)`,
          totalTokens: sql<number>`COALESCE(SUM(${traces.totalTokens}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${traces.costUsd}), 0)`,
        })
        .from(traces)
        .where(eq(traces.agentId, input.id));

      return {
        ...agent,
        currentTask,
        recentTraces,
        stats: stats[0] ?? { totalTasks: 0, totalTokens: 0, totalCost: 0 },
      };
    }),

  register: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        name: z.string(),
        type: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const agent = {
        id: nanoid(),
        integrationId: input.integrationId,
        name: input.name,
        type: input.type,
        status: "idle",
        currentTaskId: null,
        metadata: JSON.stringify(input.metadata ?? {}),
        lastSeenAt: now,
        createdAt: now,
      };
      await ctx.db.insert(agents).values(agent);
      return agent;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
        currentTaskId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        status: input.status,
        lastSeenAt: Date.now(),
      };
      if (input.currentTaskId !== undefined)
        updates.currentTaskId = input.currentTaskId;

      await ctx.db.update(agents).set(updates).where(eq(agents.id, input.id));
      return ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .then((r) => r[0]);
    }),
});
