import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations, tasks, agents, channels } from "@/server/db/schema";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  const integration = await db
    .select()
    .from(integrations)
    .where(eq(integrations.apiToken, token))
    .limit(1);

  if (!integration[0]) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type) {
    return NextResponse.json(
      { error: "Missing required query parameter: type" },
      { status: 400 }
    );
  }

  switch (type) {
    case "task": {
      const slug = searchParams.get("slug");
      const id = searchParams.get("id");

      if (!slug && !id) {
        return NextResponse.json(
          { error: "Missing query parameter: slug or id" },
          { status: 400 }
        );
      }

      let result;
      if (id) {
        result = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, id))
          .limit(1);
      } else {
        result = await db
          .select()
          .from(tasks)
          .where(eq(tasks.title, slug!))
          .limit(1);
      }

      if (result[0]) {
        return NextResponse.json({ id: result[0].id, exists: true });
      }
      return NextResponse.json({ id: null, exists: false });
    }

    case "agent": {
      const name = searchParams.get("name");
      const id = searchParams.get("id");

      if (!name && !id) {
        return NextResponse.json(
          { error: "Missing query parameter: name or id" },
          { status: 400 }
        );
      }

      let result;
      if (id) {
        result = await db
          .select()
          .from(agents)
          .where(eq(agents.id, id))
          .limit(1);
      } else {
        result = await db
          .select()
          .from(agents)
          .where(eq(agents.name, name!))
          .limit(1);
      }

      if (result[0]) {
        return NextResponse.json({ id: result[0].id, exists: true });
      }
      return NextResponse.json({ id: null, exists: false });
    }

    case "channel": {
      const taskId = searchParams.get("taskId");
      const name = searchParams.get("name");

      if (!taskId && !name) {
        return NextResponse.json(
          { error: "Missing query parameter: taskId or name" },
          { status: 400 }
        );
      }

      let result;
      if (taskId) {
        result = await db
          .select()
          .from(channels)
          .where(eq(channels.taskId, taskId))
          .limit(1);
      } else {
        result = await db
          .select()
          .from(channels)
          .where(eq(channels.name, name!))
          .limit(1);
      }

      if (result[0]) {
        return NextResponse.json({ id: result[0].id, exists: true });
      }
      return NextResponse.json({ id: null, exists: false });
    }

    default:
      return NextResponse.json(
        { error: `Unknown type: ${type}. Must be one of: task, agent, channel` },
        { status: 400 }
      );
  }
}
