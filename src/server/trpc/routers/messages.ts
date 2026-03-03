import { z } from "zod";
import { eq, desc, lt, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { messages, agents } from "@/server/db/schema";
import { eventBus } from "@/server/events/bus";

export const messagesRouter = router({
  list: publicProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(messages)
        .where(eq(messages.channelId, input.channelId))
        .orderBy(messages.createdAt);
    }),

  listByChannel: publicProcedure
    .input(
      z.object({
        channelId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(messages.channelId, input.channelId)];

      if (input.cursor) {
        conditions.push(lt(messages.createdAt, input.cursor));
      }

      const items = await ctx.db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit + 1);

      let nextCursor: number | undefined = undefined;
      if (items.length > input.limit) {
        const next = items.pop()!;
        nextCursor = next.createdAt;
      }

      // Resolve agent names
      const agentIds = [...new Set(items.map((m) => m.fromAgentId))];
      const agentMap = new Map<string, { id: string; name: string }>();

      await Promise.all(
        agentIds.map(async (agentId) => {
          const agent = await ctx.db
            .select({ id: agents.id, name: agents.name })
            .from(agents)
            .where(eq(agents.id, agentId))
            .limit(1);
          if (agent[0]) {
            agentMap.set(agentId, agent[0]);
          }
        })
      );

      const messagesWithAgents = items.reverse().map((msg) => ({
        ...msg,
        fromAgent: agentMap.get(msg.fromAgentId) ?? {
          id: msg.fromAgentId,
          name: msg.fromAgentId,
        },
        toAgent: msg.toAgentId
          ? agentMap.get(msg.toAgentId) ?? {
              id: msg.toAgentId,
              name: msg.toAgentId,
            }
          : null,
      }));

      return {
        items: messagesWithAgents,
        nextCursor,
      };
    }),

  send: publicProcedure
    .input(
      z.object({
        channelId: z.string(),
        fromAgentId: z.string(),
        toAgentId: z.string().optional(),
        content: z.string(),
        type: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const msg = {
        id: nanoid(),
        channelId: input.channelId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId ?? null,
        content: input.content,
        type: input.type ?? "text",
        metadata: JSON.stringify(input.metadata ?? {}),
        createdAt: Date.now(),
      };
      await ctx.db.insert(messages).values(msg);

      // Broadcast SSE event
      eventBus.broadcast({
        type: "message.sent",
        timestamp: msg.createdAt,
        agentId: msg.fromAgentId,
        payload: {
          messageId: msg.id,
          channelId: msg.channelId,
          fromAgentId: msg.fromAgentId,
          toAgentId: msg.toAgentId,
          content: msg.content,
          messageType: msg.type,
        },
      });

      return msg;
    }),
});
