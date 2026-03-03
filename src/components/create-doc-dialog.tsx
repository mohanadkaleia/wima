"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

const docTypes = [
  { value: "readme", label: "README" },
  { value: "changelog", label: "Changelog" },
  { value: "pr_summary", label: "PR Summary" },
  { value: "architecture", label: "Architecture" },
];

export function CreateDocDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [agentId, setAgentId] = useState("");
  const [taskId, setTaskId] = useState("");

  const utils = trpc.useUtils();
  const agentsQuery = trpc.agents.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();

  const createDoc = trpc.docs.create.useMutation({
    onSuccess: () => {
      utils.docs.list.invalidate();
      setOpen(false);
      resetForm();
    },
  });

  function resetForm() {
    setTitle("");
    setType("");
    setContent("");
    setAgentId("");
    setTaskId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !type || !agentId || !content.trim()) return;
    createDoc.mutate({
      title: title.trim(),
      type,
      content: content.trim(),
      agentId,
      taskId: taskId || undefined,
    });
  }

  const agentsList = agentsQuery.data ?? [];
  const tasksList = tasksQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Generate Doc
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {docTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Agent</label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-full">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {agentsList.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Task (optional)
            </label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 w-full">
                <SelectValue placeholder="Link task" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {tasksList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.identifier} - {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Content (Markdown)
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write document content in Markdown..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[200px] font-mono text-sm"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDoc.isPending}>
              {createDoc.isPending ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
