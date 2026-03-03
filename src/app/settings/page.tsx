"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Terminal,
  Plug,
  Zap,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      className="text-zinc-400 hover:text-zinc-200"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
}

function IntegrationCard({
  integration,
  onDelete,
}: {
  integration: {
    id: string;
    name: string;
    type: string;
    apiEndpoint: string;
    apiToken: string;
    createdAt: number;
  };
  onDelete: (id: string) => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const isOpenClaw = integration.type === "openclaw";

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              {isOpenClaw ? <Zap className="size-4" /> : <Plug className="size-4" />}
            </div>
            <div>
              <CardTitle className="text-zinc-100">{integration.name}</CardTitle>
              <CardDescription className="text-zinc-500">
                {integration.apiEndpoint}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-zinc-700 text-zinc-400"
            >
              {integration.type}
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            API Token
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-300 border border-zinc-700">
              {showToken
                ? integration.apiToken
                : `${integration.apiToken.slice(0, 8)}${"*".repeat(24)}`}
            </code>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowToken(!showToken)}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              {showToken ? "Hide" : "Show"}
            </Button>
            <CopyButton text={integration.apiToken} />
          </div>
        </div>

        {isOpenClaw && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetup(!showSetup)}
              className="text-indigo-400 hover:text-indigo-300 gap-1.5 px-0"
            >
              <Terminal className="size-3.5" />
              {showSetup ? "Hide setup instructions" : "Show setup instructions"}
            </Button>

            {showSetup && (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                <p className="text-sm text-zinc-400">
                  Run the sync script to start streaming OpenClaw events into Wima:
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">1. Copy the command:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-zinc-800 px-3 py-2 font-mono text-xs text-emerald-400 border border-zinc-700 overflow-x-auto">
                      WIMA_API_TOKEN={integration.apiToken} npx tsx src/scripts/openclaw-sync.ts
                    </code>
                    <CopyButton
                      text={`WIMA_API_TOKEN=${integration.apiToken} npx tsx src/scripts/openclaw-sync.ts`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-500">2. Optional environment variables:</p>
                  <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                    <li>
                      <code className="text-zinc-300">OPENCLAW_TASKS_PATH</code> — path to tasks.json
                      (default: ~/.openclaw/workspace/memory/tasks.json)
                    </li>
                    <li>
                      <code className="text-zinc-300">WIMA_URL</code> — Wima URL (default:
                      http://localhost:3000)
                    </li>
                    <li>
                      <code className="text-zinc-300">POLL_INTERVAL_MS</code> — poll interval in ms
                      (default: 10000)
                    </li>
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-500">
                    3. Verify events are flowing on the dashboard.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">
            Created {new Date(integration.createdAt).toLocaleDateString()}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onDelete(integration.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="size-3" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddIntegrationForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("openclaw");
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:3000/api/v1/ingest");
  const [isOpen, setIsOpen] = useState(false);

  const createMutation = trpc.integrations.create.useMutation({
    onSuccess: () => {
      setName("");
      setType("openclaw");
      setApiEndpoint("http://localhost:3000/api/v1/ingest");
      setIsOpen(false);
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = `swo_${crypto.randomUUID().replace(/-/g, "")}`;
    createMutation.mutate({
      name: name || (type === "openclaw" ? "OpenClaw" : "Custom Integration"),
      type,
      apiEndpoint,
      apiToken: token,
    });
  };

  const applyQuickSetup = () => {
    setName("OpenClaw");
    setType("openclaw");
    setApiEndpoint("http://localhost:3000/api/v1/ingest");
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
      >
        <Plus className="size-4" />
        Add Integration
      </Button>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-zinc-100">New Integration</CardTitle>
        <CardDescription className="text-zinc-500">
          Connect an external system to Wima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyQuickSetup}
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
            >
              <Zap className="size-3" />
              OpenClaw Quick Setup
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Integration"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Type
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="openclaw">OpenClaw</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              API Endpoint
            </label>
            <Input
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://localhost:3000/api/v1/ingest"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 font-mono text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Integration"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const integrationsQuery = trpc.integrations.list.useQuery();
  const deleteMutation = trpc.integrations.delete.useMutation({
    onSuccess: () => integrationsQuery.refetch(),
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="mt-2 text-zinc-400">
          Configure integrations, agents, and system preferences.
        </p>
      </div>

      {/* Integrations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-zinc-200">Integrations</h2>
            <p className="text-sm text-zinc-500">
              Manage external connections that feed events into Wima.
            </p>
          </div>
          <AddIntegrationForm
            onSuccess={() => integrationsQuery.refetch()}
          />
        </div>

        {integrationsQuery.isLoading && (
          <div className="text-sm text-zinc-500">Loading integrations...</div>
        )}

        {integrationsQuery.data?.length === 0 && (
          <Card className="border-zinc-800 bg-zinc-900/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Plug className="size-8 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">No integrations configured yet.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Add an integration to start receiving events.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {integrationsQuery.data?.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
