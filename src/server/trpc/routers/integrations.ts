import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { integrations } from "@/server/db/schema";

export const integrationsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(integrations)
      .orderBy(desc(integrations.createdAt));
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
        apiEndpoint: z.string(),
        apiToken: z.string(),
        webhookSecret: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const integration = {
        id: nanoid(),
        name: input.name,
        type: input.type,
        apiEndpoint: input.apiEndpoint,
        apiToken: input.apiToken,
        webhookSecret: input.webhookSecret ?? null,
        createdAt: Date.now(),
      };
      await ctx.db.insert(integrations).values(integration);
      return integration;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
        apiEndpoint: z.string().optional(),
        apiToken: z.string().optional(),
        webhookSecret: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await ctx.db.update(integrations).set(updates).where(eq(integrations.id, id));
      return ctx.db
        .select()
        .from(integrations)
        .where(eq(integrations.id, id))
        .then((r) => r[0]);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(integrations).where(eq(integrations.id, input.id));
      return { success: true };
    }),
});
