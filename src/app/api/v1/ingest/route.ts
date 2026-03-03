import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations } from "@/server/db/schema";
import { handleIngestEvent } from "@/server/events/handlers";

const ingestSchema = z.object({
  events: z.array(
    z.object({
      type: z.string(),
      timestamp: z.number().optional(),
      agentId: z.string().optional(),
      payload: z.record(z.string(), z.unknown()).default({}),
    })
  ),
});

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const parsed = ingestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const results = [];
  for (const event of parsed.data.events) {
    const record = await handleIngestEvent(
      {
        type: event.type,
        timestamp: event.timestamp ?? Date.now(),
        agentId: event.agentId,
        payload: event.payload,
      },
      integration[0].id
    );
    results.push({
      type: record.type,
      resourceId: record.resourceId,
    });
  }

  return NextResponse.json({ received: parsed.data.events.length, results });
}
