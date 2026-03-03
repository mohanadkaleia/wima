"use client";

import { useState, useEffect, useCallback, use } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { MessageThread, type ThreadMessage } from "@/components/message-thread";
import { useSSE } from "@/hooks/use-sse";
import { cn } from "@/lib/utils";
import {
  Plus,
  MessageSquare,
  Hash,
  Radio,
  ArrowLeftRight,
  Send,
  LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const channelTypeConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  task: {
    label: "Task",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: Hash,
  },
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

export default function ChannelThreadPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<string>("task");

  // Queries
  const channelsQuery = trpc.channels.list.useQuery();
  const channelQuery = trpc.channels.getById.useQuery({ id: channelId });
  const messagesQuery = trpc.messages.listByChannel.useQuery({
    channelId,
    limit: 50,
  });
  const agentsQuery = trpc.agents.list.useQuery();

  const createChannel = trpc.channels.create.useMutation({
    onSuccess: (channel) => {
      channelsQuery.refetch();
      setCreateOpen(false);
      setNewChannelName("");
      setNewChannelType("task");
      router.push(`/messages/${channel.id}`);
    },
  });

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      channelsQuery.refetch();
      setMessageText("");
    },
  });

  // SSE for real-time messages
  const { events } = useSSE();

  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (
      lastEvent?.type === "message.sent" &&
      lastEvent.payload?.channelId === channelId
    ) {
      messagesQuery.refetch();
      channelsQuery.refetch();
    }
  }, [events, channelId, messagesQuery, channelsQuery]);

  const handleSend = useCallback(() => {
    if (!messageText.trim()) return;
    const agents = agentsQuery.data;
    const fromAgentId = agents?.[0]?.id ?? "system";

    sendMessage.mutate({
      channelId,
      fromAgentId,
      content: messageText.trim(),
      type: "text",
    });
  }, [messageText, channelId, agentsQuery.data, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const channelsData = channelsQuery.data ?? [];
  const channel = channelQuery.data;
  const threadMessages: ThreadMessage[] = (messagesQuery.data?.items ?? []) as ThreadMessage[];

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
            {channelsData.map((ch) => {
              const typeConfig =
                channelTypeConfig[ch.type] ?? channelTypeConfig.task;
              const TypeIcon = typeConfig.icon;
              const isActive = ch.id === channelId;

              return (
                <button
                  key={ch.id}
                  onClick={() => router.push(`/messages/${ch.id}`)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <TypeIcon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isActive ? "text-zinc-400" : "text-zinc-600"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isActive ? "text-zinc-100" : "text-zinc-300"
                        )}
                      >
                        {ch.name}
                      </span>
                      {ch.lastMessage && (
                        <span className="shrink-0 text-xs text-zinc-600">
                          {formatTime(ch.lastMessage.createdAt)}
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
                      {ch.lastMessage && (
                        <span className="truncate text-xs text-zinc-600">
                          {ch.lastMessage.content.slice(0, 40)}
                          {ch.lastMessage.content.length > 40 ? "..." : ""}
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

      {/* Message thread */}
      <div className="flex flex-1 flex-col bg-zinc-950">
        {/* Channel header */}
        {channel && (
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-zinc-100">
                {channel.name}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  (channelTypeConfig[channel.type] ?? channelTypeConfig.task)
                    .color
                )}
              >
                {(channelTypeConfig[channel.type] ?? channelTypeConfig.task)
                  .label}
              </Badge>
              {channel.taskId && (
                <Link
                  href={`/tasks`}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <LinkIcon className="h-3 w-3" />
                  Linked Task
                </Link>
              )}
            </div>
            {channel.participants && channel.participants.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500">
                  {channel.participants.length} participant
                  {channel.participants.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {messagesQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-zinc-600">Loading messages...</p>
            </div>
          ) : (
            <MessageThread
              messages={threadMessages}
              loading={messagesQuery.isLoading}
              hasMore={!!messagesQuery.data?.nextCursor}
              onLoadMore={() => {
                // For now, refetch; could implement cursor-based loading
              }}
            />
          )}

          {/* Message input */}
          <div className="border-t border-zinc-800 p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="min-h-10 max-h-32 resize-none border-zinc-700 bg-zinc-900 text-zinc-200 placeholder:text-zinc-600"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || sendMessage.isPending}
                size="icon"
                className="h-10 w-10 shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
