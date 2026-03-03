import { db } from "../server/db/index.js";
import { agents, traces, observations, channels, messages, decisions, docs, events, tasks } from "../server/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  // Wipe all seed/fixture data
  await db.delete(observations);
  await db.delete(traces);
  await db.delete(messages);
  await db.delete(channels);
  await db.delete(decisions);
  await db.delete(docs);
  await db.delete(agents);
  await db.delete(events);

  // Delete seed tasks, keep real OpenClaw ones (todo-cli, blog)
  const allTasks = await db.select().from(tasks);
  const realSlugs = ["todo-cli", "blog"];
  for (const t of allTasks) {
    if (!realSlugs.includes(t.title)) {
      await db.delete(tasks).where(eq(tasks.id, t.id));
    }
  }

  const remaining = await db.select().from(tasks);
  console.log("Remaining tasks:", remaining.map((t) => `${t.identifier}: ${t.title}`));
  console.log("Seed data wiped.");
}

main().catch(console.error);
