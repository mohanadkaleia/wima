"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, Bot, LinkIcon, Calendar } from "lucide-react";

const typeConfig: Record<string, { label: string; className: string }> = {
  readme: {
    label: "README",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  changelog: {
    label: "Changelog",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  pr_summary: {
    label: "PR Summary",
    className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  architecture: {
    label: "Architecture",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
};

export default function DocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const docQuery = trpc.docs.getById.useQuery({ id });
  const doc = docQuery.data;

  if (docQuery.isLoading) {
    return (
      <div className="text-center py-12 text-zinc-500">Loading document...</div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-zinc-300">
          Document not found
        </h2>
        <Link
          href="/docs"
          className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
        >
          Back to docs
        </Link>
      </div>
    );
  }

  const config = typeConfig[doc.type] ?? {
    label: doc.type,
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  const createdDate = new Date(doc.createdAt);
  const updatedDate = new Date(doc.updatedAt);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/docs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to docs
      </Link>

      {/* Title + type badge + version */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-zinc-100">{doc.title}</h1>
          <Badge
            className={cn(
              "text-xs px-2 py-0.5 h-6 border shrink-0",
              config.className
            )}
          >
            {config.label}
          </Badge>
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-2 py-0.5 h-6 bg-zinc-800 text-zinc-300 border-zinc-700 shrink-0"
        >
          v{doc.version}
        </Badge>
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-400 border border-zinc-800 rounded-lg bg-zinc-900/50 px-4 py-3">
        {doc.agent && (
          <span className="flex items-center gap-1.5">
            <Bot className="size-4 text-zinc-500" />
            {doc.agent.name}
          </span>
        )}
        {doc.task && (
          <Link
            href={`/tasks/${doc.task.id}`}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
          >
            <LinkIcon className="size-4" />
            {doc.task.identifier}
          </Link>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4 text-zinc-500" />
          Created{" "}
          {createdDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        {doc.updatedAt !== doc.createdAt && (
          <span className="text-xs text-zinc-600">
            Updated{" "}
            {updatedDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Document content */}
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 p-6 md:p-8">
        <MarkdownRenderer content={doc.content} />
      </div>
    </div>
  );
}
