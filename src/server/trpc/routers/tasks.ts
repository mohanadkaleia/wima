import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { tasks } from "@/server/db/schema";

export const tasksRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          priority: z.number().optional(),
          projectId: z.string().optional(),
          assigneeAgentId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.status) conditions.push(eq(tasks.status, input.status));
      if (input?.priority !== undefined && input?.priority !== null)
        conditions.push(eq(tasks.priority, input.priority));
      if (input?.projectId) conditions.push(eq(tasks.projectId, input.projectId));
      if (input?.assigneeAgentId)
        conditions.push(eq(tasks.assigneeAgentId, input.assigneeAgentId));

      return ctx.db
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tasks.priority), desc(tasks.createdAt));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        projectId: z.string().optional(),
        parentTaskId: z.string().optional(),
        labels: z.array(z.string()).optional(),
        assigneeAgentId: z.string().optional(),
        integrationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maxResult = await ctx.db
        .select({ identifier: tasks.identifier })
        .from(tasks)
        .orderBy(desc(tasks.createdAt));

      let nextNum = 1;
      if (maxResult.length > 0) {
        const nums = maxResult
          .map((r) => parseInt(r.identifier.replace("SW-", ""), 10))
          .filter((n) => !isNaN(n));
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }

      const now = Date.now();
      const task = {
        id: nanoid(),
        identifier: `SW-${nextNum}`,
        title: input.title,
        description: input.description ?? "",
        status: input.status ?? "backlog",
        priority: input.priority ?? 0,
        projectId: input.projectId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        assigneeAgentId: input.assigneeAgentId ?? null,
        labels: JSON.stringify(input.labels ?? []),
        integrationId: input.integrationId ?? null,
        branchName: null,
        worktreePath: null,
        prUrl: null,
        createdAt: now,
        startedAt: null,
        completedAt: null,
        updatedAt: now,
      };

      await ctx.db.insert(tasks).values(task);
      return task;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        assigneeAgentId: z.string().nullable().optional(),
        projectId: z.string().nullable().optional(),
        labels: z.array(z.string()).optional(),
        branchName: z.string().nullable().optional(),
        worktreePath: z.string().nullable().optional(),
        prUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, labels, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest, updatedAt: Date.now() };
      if (labels) updates.labels = JSON.stringify(labels);
      if (rest.status === "in_progress" && !updates.startedAt)
        updates.startedAt = Date.now();
      if (rest.status === "done") updates.completedAt = Date.now();

      await ctx.db.update(tasks).set(updates).where(eq(tasks.id, id));
      return ctx.db.select().from(tasks).where(eq(tasks.id, id)).then((r) => r[0]);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(tasks).where(eq(tasks.id, input.id));
      return { success: true };
    }),
});
