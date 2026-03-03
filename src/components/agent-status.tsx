import { cn } from "@/lib/utils";

interface AgentStatusProps {
  status: string;
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<string, { color: string; pulse: boolean; label: string }> = {
  running: { color: "bg-emerald-500", pulse: true, label: "Running" },
  idle: { color: "bg-zinc-500", pulse: false, label: "Idle" },
  error: { color: "bg-red-500", pulse: false, label: "Error" },
};

export function AgentStatus({ status, showLabel = true, className }: AgentStatusProps) {
  const config = statusConfig[status] ?? statusConfig.idle;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.color
            )}
          />
        )}
        <span
          className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", config.color)}
        />
      </span>
      {showLabel && (
        <span className="text-sm text-zinc-400 capitalize">{config.label}</span>
      )}
    </div>
  );
}
