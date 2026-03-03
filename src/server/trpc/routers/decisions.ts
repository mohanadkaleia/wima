import { z } from "zod";
import { eq, desc, and, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { decisions, agents, tasks, traces } from "@/server/db/schema";

export const decisionsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          agentId: z.string().optional(),
          taskId: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.agentId) conditions.push(eq(decisions.agentId, input.agentId));
      if (input?.taskId) conditions.push(eq(decisions.taskId, input.taskId));
      if (input?.status) conditions.push(eq(decisions.status, input.status));
      if (input?.search) {
        conditions.push(
          or(
            like(decisions.title, `%${input.search}%`),
            like(decisions.context, `%${input.search}%`)
          )!
        );
      }

      const rows = await ctx.db
        .select()
        .from(decisions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(decisions.createdAt));

      const result = await Promise.all(
        rows.map(async (row) => {
          const agent = await ctx.db
            .select({ id: agents.id, name: agents.name })
            .from(agents)
            .where(eq(agents.id, row.agentId))
            .limit(1)
            .then((r) => r[0] ?? null);

          const task = row.taskId
            ? await ctx.db
                .select({ id: tasks.id, identifier: tasks.identifier, title: tasks.title })
                .from(tasks)
                .where(eq(tasks.id, row.taskId))
                .limit(1)
                .then((r) => r[0] ?? null)
            : null;

          return { ...row, agent, task };
        })
      );

      return result;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(decisions)
        .where(eq(decisions.id, input.id))
        .limit(1);

      const row = result[0] ?? null;
      if (!row) return null;

      const agent = await ctx.db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.id, row.agentId))
        .limit(1)
        .then((r) => r[0] ?? null);

      const task = row.taskId
        ? await ctx.db
            .select({ id: tasks.id, identifier: tasks.identifier, title: tasks.title })
            .from(tasks)
            .where(eq(tasks.id, row.taskId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      const trace = row.traceId
        ? await ctx.db
            .select({ id: traces.id, name: traces.name })
            .from(traces)
            .where(eq(traces.id, row.traceId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      return { ...row, agent, task, trace };
    }),

  create: publicProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        traceId: z.string().optional(),
        agentId: z.string(),
        title: z.string(),
        status: z.string().optional(),
        context: z.string(),
        decision: z.string(),
        alternatives: z.string().optional(),
        consequences: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dec = {
        id: nanoid(),
        taskId: input.taskId ?? null,
        traceId: input.traceId ?? null,
        agentId: input.agentId,
        title: input.title,
        status: input.status ?? "proposed",
        context: input.context,
        decision: input.decision,
        alternatives: input.alternatives ?? null,
        consequences: input.consequences ?? null,
        createdAt: Date.now(),
      };
      await ctx.db.insert(decisions).values(dec);
      return dec;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(decisions)
        .set({ status: input.status })
        .where(eq(decisions.id, input.id));
      return ctx.db
        .select()
        .from(decisions)
        .where(eq(decisions.id, input.id))
        .then((r) => r[0]);
    }),
});
