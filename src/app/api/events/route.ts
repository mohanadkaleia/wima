import { eventBus, type SwarmEvent } from "@/server/events/bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const listener = (event: SwarmEvent) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected
          cleanup();
        }
      };

      const cleanup = () => {
        eventBus.off("event", listener);
      };

      eventBus.on("event", listener);

      // Send initial heartbeat
      controller.enqueue(encoder.encode(": heartbeat\n\n"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
