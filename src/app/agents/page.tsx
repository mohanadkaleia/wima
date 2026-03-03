"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Bot, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSSE } from "@/hooks/use-sse";
import { AgentStatus } from "@/components/agent-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function RegisterAgentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("coding");
  const [integrationId, setIntegrationId] = useState("");

  const utils = trpc.useUtils();
  const integrations = trpc.integrations.list.useQuery();
  const register = trpc.agents.register.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setOpen(false);
      setName("");
      setType("coding");
      setIntegrationId("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Register Agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Agent</DialogTitle>
          <DialogDescription>
            Add a new AI agent to your fleet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <Input
              placeholder="e.g. claude-coder-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="ops">Ops</SelectItem>
                <SelectItem value="research">Research</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Integration</label>
            <Select value={integrationId} onValueChange={setIntegrationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select integration" />
              </SelectTrigger>
              <SelectContent>
                {integrations.data?.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.name}
                  </SelectItem>
                ))}
                {(!integrations.data || integrations.data.length === 0) && (
                  <SelectItem value="_none" disabled>
                    No integrations configured
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              register.mutate({ name, type, integrationId })
            }
            disabled={!name || !integrationId || register.isPending}
          >
            {register.isPending ? "Registering..." : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const { events } = useSSE();
  const utils = trpc.useUtils();
  const agents = trpc.agents.list.useQuery();

  // Invalidate on relevant SSE events
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;

    const agentEvents = [
      "agent.started",
      "agent.completed",
      "agent.failed",
      "agent.heartbeat",
    ];
    if (agentEvents.includes(lastEvent.type)) {
      utils.agents.list.invalidate();
    }
  }, [events, utils.agents.list]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Agent Fleet</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor and manage your AI agents.
          </p>
        </div>
        <RegisterAgentDialog />
      </div>

      {agents.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="space-y-3">
                <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {agents.data && agents.data.length === 0 && (
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-zinc-600" />
              <h3 className="text-lg font-medium text-zinc-300">
                No agents registered
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Register your first agent to start monitoring your AI fleet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {agents.data && agents.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.data.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card className="border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium text-zinc-200">
                      {agent.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-zinc-800 text-zinc-400 text-[10px]"
                    >
                      {agent.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AgentStatus status={agent.status} />

                  {agent.currentTask && (
                    <p className="truncate text-xs text-zinc-400">
                      {agent.currentTask.title}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(agent.lastSeenAt)}
                    </span>
                    <span>${(agent.totalCost ?? 0).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
