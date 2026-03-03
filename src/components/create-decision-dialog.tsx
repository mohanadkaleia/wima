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

export function CreateDecisionDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [consequences, setConsequences] = useState("");
  const [agentId, setAgentId] = useState("");
  const [taskId, setTaskId] = useState("");

  const utils = trpc.useUtils();
  const agentsQuery = trpc.agents.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();

  const createDecision = trpc.decisions.create.useMutation({
    onSuccess: () => {
      utils.decisions.list.invalidate();
      setOpen(false);
      resetForm();
    },
  });

  function resetForm() {
    setTitle("");
    setContext("");
    setDecision("");
    setAlternatives("");
    setConsequences("");
    setAgentId("");
    setTaskId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !agentId || !context.trim() || !decision.trim()) return;
    createDecision.mutate({
      title: title.trim(),
      context: context.trim(),
      decision: decision.trim(),
      alternatives: alternatives.trim() || undefined,
      consequences: consequences.trim() || undefined,
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
          Create Decision
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Create Decision (ADR)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Use PostgreSQL for primary data store"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Context</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the context and problem statement..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[80px]"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Decision</label>
            <Textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Describe the decision that was made..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[80px]"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Alternatives Considered (optional)
            </label>
            <Textarea
              value={alternatives}
              onChange={(e) => setAlternatives(e.target.value)}
              placeholder="What alternatives were considered..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[60px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Consequences (optional)
            </label>
            <Textarea
              value={consequences}
              onChange={(e) => setConsequences(e.target.value)}
              placeholder="What are the consequences of this decision..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[60px]"
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
            <Button type="submit" disabled={createDecision.isPending}>
              {createDecision.isPending ? "Creating..." : "Create Decision"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
