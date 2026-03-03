import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { traces, observations } from "@/server/db/schema";

export const tracesRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          taskId: z.string().optional(),
          agentId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (input?.taskId) {
        return ctx.db
          .select()
          .from(traces)
          .where(eq(traces.taskId, input.taskId))
          .orderBy(desc(traces.startTime));
      }
      if (input?.agentId) {
        return ctx.db
          .select()
          .from(traces)
          .where(eq(traces.agentId, input.agentId))
          .orderBy(desc(traces.startTime));
      }
      return ctx.db.select().from(traces).orderBy(desc(traces.startTime));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const trace = await ctx.db
        .select()
        .from(traces)
        .where(eq(traces.id, input.id))
        .limit(1);

      if (!trace[0]) return null;

      const obs = await ctx.db
        .select()
        .from(observations)
        .where(eq(observations.traceId, input.id))
        .orderBy(observations.startTime);

      return { ...trace[0], observations: obs };
    }),
});
