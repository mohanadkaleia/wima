import { router } from "./trpc";
import { tasksRouter } from "./routers/tasks";
import { agentsRouter } from "./routers/agents";
import { tracesRouter } from "./routers/traces";
import { messagesRouter } from "./routers/messages";
import { channelsRouter } from "./routers/channels";
import { decisionsRouter } from "./routers/decisions";
import { docsRouter } from "./routers/docs";
import { integrationsRouter } from "./routers/integrations";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  tasks: tasksRouter,
  agents: agentsRouter,
  traces: tracesRouter,
  messages: messagesRouter,
  channels: channelsRouter,
  decisions: decisionsRouter,
  docs: docsRouter,
  integrations: integrationsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
