"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowRight, FileIcon, Info } from "lucide-react";

interface MessageAgent {
  id: string;
  name: string;
}

export interface ThreadMessage {
  id: string;
  channelId: string;
  fromAgentId: string;
  toAgentId: string | null;
  content: string;
  type: string;
  metadata: string;
  createdAt: number;
  fromAgent: MessageAgent;
  toAgent: MessageAgent | null;
}

interface MessageThreadProps {
  messages: ThreadMessage[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const AGENT_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
];

function getAgentColor(agentId: string): string {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function AgentAvatar({
  name,
  agentId,
  size = "md",
}: {
  name: string;
  agentId: string;
  size?: "sm" | "md";
}) {
  const colorClass = getAgentColor(agentId);
  const sizeClass = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        colorClass,
        sizeClass
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TextMessage({
  message,
  showAvatar,
  showName,
}: {
  message: ThreadMessage;
  showAvatar: boolean;
  showName: boolean;
}) {
  return (
    <div className={cn("group flex items-start gap-3", !showAvatar && "pl-11")}>
      {showAvatar && (
        <AgentAvatar
          name={message.fromAgent.name}
          agentId={message.fromAgentId}
        />
      )}
      <div className="min-w-0 flex-1">
        {showName && (
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              {message.fromAgent.name}
            </span>
            <span className="text-xs text-zinc-500">
              {formatFullTime(message.createdAt)}
            </span>
          </div>
        )}
        <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
      {!showName && (
        <span className="mt-0.5 hidden text-xs text-zinc-600 group-hover:block">
          {formatFullTime(message.createdAt)}
        </span>
      )}
    </div>
  );
}

function HandoffMessage({ message }: { message: ThreadMessage }) {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(message.metadata);
  } catch {
    // ignore
  }

  return (
    <div className="mx-4 my-2">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-400">
          <ArrowRight className="h-4 w-4" />
          <span>Handoff</span>
        </div>
        <div className="mb-2 flex items-center gap-2 text-sm">
          <AgentAvatar
            name={message.fromAgent.name}
            agentId={message.fromAgentId}
            size="sm"
          />
          <span className="text-zinc-300">{message.fromAgent.name}</span>
          <ArrowRight className="h-3 w-3 text-zinc-500" />
          {message.toAgent && (
            <>
              <AgentAvatar
                name={message.toAgent.name}
                agentId={message.toAgent.id}
                size="sm"
              />
              <span className="text-zinc-300">{message.toAgent.name}</span>
            </>
          )}
        </div>
        <div className="text-sm text-zinc-400 whitespace-pre-wrap">
          {message.content}
        </div>
        {metadata.context != null && (
          <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="mb-1 text-xs font-medium text-zinc-500">Context</p>
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap">
              {typeof metadata.context === "string"
                ? metadata.context
                : JSON.stringify(metadata.context, null, 2)}
            </pre>
          </div>
        )}
        <div className="mt-2 text-xs text-zinc-600">
          {formatFullTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

function StatusUpdateMessage({ message }: { message: ThreadMessage }) {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-2 rounded-full bg-zinc-800/50 px-4 py-1.5">
        <Info className="h-3 w-3 text-zinc-500" />
        <span className="text-xs text-zinc-500">{message.content}</span>
        <span className="text-xs text-zinc-600">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function FileMessage({
  message,
  showAvatar,
  showName,
}: {
  message: ThreadMessage;
  showAvatar: boolean;
  showName: boolean;
}) {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(message.metadata);
  } catch {
    // ignore
  }

  return (
    <div className={cn("group flex items-start gap-3", !showAvatar && "pl-11")}>
      {showAvatar && (
        <AgentAvatar
          name={message.fromAgent.name}
          agentId={message.fromAgentId}
        />
      )}
      <div className="min-w-0 flex-1">
        {showName && (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              {message.fromAgent.name}
            </span>
            <span className="text-xs text-zinc-500">
              {formatFullTime(message.createdAt)}
            </span>
          </div>
        )}
        <div className="inline-flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <FileIcon className="h-8 w-8 text-zinc-500" />
          <div>
            <p className="text-sm font-medium text-zinc-300">
              {(metadata.filename as string) ?? "File attachment"}
            </p>
            {metadata.size != null && (
              <p className="text-xs text-zinc-500">
                {String(metadata.size)}
              </p>
            )}
          </div>
        </div>
        {message.content && (
          <p className="mt-1 text-sm text-zinc-400">{message.content}</p>
        )}
      </div>
    </div>
  );
}

export function MessageThread({
  messages: messageList,
  loading,
  onLoadMore,
  hasMore,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (messageList.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messageList.length;
  }, [messageList.length]);

  // Group consecutive messages from same agent (only for text/file types)
  function shouldShowAvatar(index: number): boolean {
    if (index === 0) return true;
    const curr = messageList[index];
    const prev = messageList[index - 1];
    if (
      curr.type === "handoff" ||
      curr.type === "status_update" ||
      prev.type === "handoff" ||
      prev.type === "status_update"
    )
      return true;
    if (curr.fromAgentId !== prev.fromAgentId) return true;
    // Show avatar if gap > 5 minutes
    if (curr.createdAt - prev.createdAt > 300000) return true;
    return false;
  }

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className="flex flex-col px-4 py-4">
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="rounded-md bg-zinc-800 px-4 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        {messageList.length === 0 && !loading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <p className="text-sm text-zinc-600">
              No messages yet. Send the first message below.
            </p>
          </div>
        )}

        <div className="space-y-1">
          {messageList.map((msg, index) => {
            const showAvatar = shouldShowAvatar(index);

            switch (msg.type) {
              case "handoff":
                return <HandoffMessage key={msg.id} message={msg} />;
              case "status_update":
                return <StatusUpdateMessage key={msg.id} message={msg} />;
              case "file":
                return (
                  <FileMessage
                    key={msg.id}
                    message={msg}
                    showAvatar={showAvatar}
                    showName={showAvatar}
                  />
                );
              default:
                return (
                  <TextMessage
                    key={msg.id}
                    message={msg}
                    showAvatar={showAvatar}
                    showName={showAvatar}
                  />
                );
            }
          })}
        </div>

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
