import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure } from "../trpc";
import { channels, messages, agents } from "@/server/db/schema";

export const channelsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const allChannels = await ctx.db
      .select()
      .from(channels)
      .orderBy(desc(channels.createdAt));

    const result = await Promise.all(
      allChannels.map(async (channel) => {
        const lastMsg = await ctx.db
          .select()
          .from(messages)
          .where(eq(messages.channelId, channel.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const msgCount = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.channelId, channel.id));

        return {
          ...channel,
          lastMessage: lastMsg[0] ?? null,
          messageCount: msgCount[0]?.count ?? 0,
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
        .from(channels)
        .where(eq(channels.id, input.id))
        .limit(1);

      if (!result[0]) return null;

      const channel = result[0];

      // Get unique agents who have sent messages in this channel
      const channelMessages = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.channelId, channel.id));

      const agentIds = [
        ...new Set(channelMessages.map((m) => m.fromAgentId)),
      ];

      const participantAgents =
        agentIds.length > 0
          ? await Promise.all(
              agentIds.map(async (agentId) => {
                const agent = await ctx.db
                  .select()
                  .from(agents)
                  .where(eq(agents.id, agentId))
                  .limit(1);
                return agent[0] ?? null;
              })
            )
          : [];

      return {
        ...channel,
        participants: participantAgents.filter(Boolean),
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["task", "handoff", "broadcast"]).default("task"),
        taskId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const channel = {
        id: nanoid(),
        name: input.name,
        type: input.type,
        taskId: input.taskId ?? null,
        createdAt: Date.now(),
      };
      await ctx.db.insert(channels).values(channel);
      return channel;
    }),
});
