import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { docs, agents, tasks } from "@/server/db/schema";

export const docsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          type: z.string().optional(),
          agentId: z.string().optional(),
          taskId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.type) conditions.push(eq(docs.type, input.type));
      if (input?.agentId) conditions.push(eq(docs.agentId, input.agentId));
      if (input?.taskId) conditions.push(eq(docs.taskId, input.taskId));

      const rows = await ctx.db
        .select()
        .from(docs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(docs.createdAt));

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
        .from(docs)
        .where(eq(docs.id, input.id))
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

      return { ...row, agent, task };
    }),

  create: publicProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        agentId: z.string(),
        type: z.string(),
        title: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const doc = {
        id: nanoid(),
        taskId: input.taskId ?? null,
        agentId: input.agentId,
        type: input.type,
        title: input.title,
        content: input.content,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.insert(docs).values(doc);
      return doc;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(docs)
        .where(eq(docs.id, input.id))
        .limit(1);

      if (!existing[0]) throw new Error("Doc not found");

      const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
        version: existing[0].version + 1,
      };
      if (input.title) updates.title = input.title;
      if (input.content) updates.content = input.content;

      await ctx.db.update(docs).set(updates).where(eq(docs.id, input.id));
      return ctx.db
        .select()
        .from(docs)
        .where(eq(docs.id, input.id))
        .then((r) => r[0]);
    }),
});
