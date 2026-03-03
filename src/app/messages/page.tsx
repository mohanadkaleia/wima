"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  MessageSquare,
  Hash,
  Radio,
  ArrowLeftRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

const channelTypeConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  task: { label: "Task", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: Hash },
  handoff: {
    label: "Handoff",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: ArrowLeftRight,
  },
  broadcast: {
    label: "Broadcast",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Radio,
  },
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<string>("task");

  const channelsQuery = trpc.channels.list.useQuery();
  const createChannel = trpc.channels.create.useMutation({
    onSuccess: (channel) => {
      channelsQuery.refetch();
      setCreateOpen(false);
      setNewChannelName("");
      setNewChannelType("task");
      router.push(`/messages/${channel.id}`);
    },
  });

  const channels = channelsQuery.data ?? [];

  return (
    <div className="-mx-8 -my-6 flex h-[calc(100vh)] overflow-hidden">
      {/* Channel sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">Channels</h2>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCreateOpen(true)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {channelsQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-zinc-600">Loading channels...</p>
              </div>
            )}

            {channels.length === 0 && !channelsQuery.isLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-xs text-zinc-600">No channels yet</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Create one
                </button>
              </div>
            )}

            {channels.map((channel) => {
              const typeConfig = channelTypeConfig[channel.type] ?? channelTypeConfig.task;
              const TypeIcon = typeConfig.icon;

              return (
                <button
                  key={channel.id}
                  onClick={() => router.push(`/messages/${channel.id}`)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-300">
                        {channel.name}
                      </span>
                      {channel.lastMessage && (
                        <span className="shrink-0 text-xs text-zinc-600">
                          {formatTime(channel.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[10px] leading-none",
                          typeConfig.color
                        )}
                      >
                        {typeConfig.label}
                      </Badge>
                      {channel.lastMessage && (
                        <span className="truncate text-xs text-zinc-600">
                          {channel.lastMessage.content.slice(0, 40)}
                          {channel.lastMessage.content.length > 40 ? "..." : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Empty state - no channel selected */}
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
          <h3 className="text-lg font-medium text-zinc-500">
            Select a channel to view messages
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Choose a channel from the sidebar or create a new one
          </p>
        </div>
      </div>

      {/* Create channel dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">New Channel</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Create a communication channel for your agents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                Name
              </label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. SW-42 Implementation"
                className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                Type
              </label>
              <Select value={newChannelType} onValueChange={setNewChannelType}>
                <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="task" className="text-zinc-200">
                    Task
                  </SelectItem>
                  <SelectItem value="handoff" className="text-zinc-200">
                    Handoff
                  </SelectItem>
                  <SelectItem value="broadcast" className="text-zinc-200">
                    Broadcast
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                createChannel.mutate({
                  name: newChannelName,
                  type: newChannelType as "task" | "handoff" | "broadcast",
                })
              }
              disabled={!newChannelName.trim() || createChannel.isPending}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {createChannel.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
