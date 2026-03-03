#!/usr/bin/env bash
# spawn-agent.sh — Spawn a Claude Code agent with full SwarmOps tracking.
#
# Usage:
#   bash ~/workspace/swarmops/src/scripts/spawn-agent.sh \
#     --task-slug "fix-auth-bug" \
#     --task-description "Fix the authentication timeout bug" \
#     --repo "/Users/mohanadkaleia/workspace/myproject" \
#     --branch "fix/auth-timeout" \
#     --token "swo_cn5T_..." \
#     --url "http://localhost:3002"

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
SWARMOPS_URL="${SWARMOPS_URL:-http://localhost:3002}"
SWARMOPS_TOKEN="${SWARMOPS_TOKEN:-}"
TASK_SLUG=""
TASK_DESCRIPTION=""
REPO=""
BRANCH=""
WORKTREE_BASE="${HOME}/openclaw-worktrees"
SWARMOPS_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CLI_PATH="${SWARMOPS_DIR}/src/scripts/cli.ts"
HOOK_SCRIPT="${SWARMOPS_DIR}/src/scripts/swarmops-hook.sh"
PARSE_SESSION="${SWARMOPS_DIR}/src/scripts/parse-session.ts"
TEMPLATE_PATH="${SWARMOPS_DIR}/src/templates/CLAUDE.md"
START_TIME=$(date +%s)

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --task-slug)     TASK_SLUG="$2"; shift 2 ;;
    --task-description) TASK_DESCRIPTION="$2"; shift 2 ;;
    --repo)          REPO="$2"; shift 2 ;;
    --branch)        BRANCH="$2"; shift 2 ;;
    --token)         SWARMOPS_TOKEN="$2"; shift 2 ;;
    --url)           SWARMOPS_URL="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------
if [[ -z "$TASK_SLUG" ]]; then
  echo "Error: --task-slug is required"
  exit 1
fi
if [[ -z "$TASK_DESCRIPTION" ]]; then
  echo "Error: --task-description is required"
  exit 1
fi
if [[ -z "$REPO" ]]; then
  echo "Error: --repo is required"
  exit 1
fi
if [[ -z "$BRANCH" ]]; then
  BRANCH="agent/${TASK_SLUG}"
fi

# ---------------------------------------------------------------------------
# Helper: POST to ingest API (fire-and-forget if SwarmOps is down)
# ---------------------------------------------------------------------------
ingest() {
  local payload="$1"
  curl -s -X POST "${SWARMOPS_URL}/api/v1/ingest" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SWARMOPS_TOKEN}" \
    -d "$payload" 2>/dev/null || echo '{"error":"SwarmOps unreachable"}'
}

# ---------------------------------------------------------------------------
# Helper: Resolve an ID via /api/v1/resolve
# ---------------------------------------------------------------------------
resolve() {
  local query="$1"
  curl -s "${SWARMOPS_URL}/api/v1/resolve?${query}" \
    -H "Authorization: Bearer ${SWARMOPS_TOKEN}" 2>/dev/null || echo '{"id":null,"exists":false}'
}

# ---------------------------------------------------------------------------
# Generate IDs
# ---------------------------------------------------------------------------
AGENT_ID="agent-$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 12 || true)"
TRACE_ID="trace-$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 12 || true)"
AGENT_NAME="claude-worker-$$"
WORKTREE_PATH="${WORKTREE_BASE}/${TASK_SLUG}"

echo "=== SwarmOps Agent Spawn ==="
echo "  Task:      ${TASK_SLUG}"
echo "  Branch:    ${BRANCH}"
echo "  Repo:      ${REPO}"
echo "  Agent:     ${AGENT_NAME} (${AGENT_ID})"
echo "  Trace:     ${TRACE_ID}"
echo "  Worktree:  ${WORKTREE_PATH}"
echo ""

# ---------------------------------------------------------------------------
# 1. Create/find the task in SwarmOps
# ---------------------------------------------------------------------------
echo "[1/10] Creating/finding task..."
RESOLVE_RESULT=$(resolve "type=task&slug=${TASK_SLUG}")
TASK_EXISTS=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exists', False))" 2>/dev/null || echo "False")
TASK_ID=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [[ "$TASK_EXISTS" == "True" || "$TASK_EXISTS" == "true" ]] && [[ -n "$TASK_ID" && "$TASK_ID" != "None" ]]; then
  echo "  Task exists: ${TASK_ID}"
  # Update status to in_progress
  ingest "{\"events\":[{\"type\":\"task.updated\",\"timestamp\":$(date +%s)000,\"payload\":{\"resourceType\":\"task\",\"resourceId\":\"${TASK_ID}\",\"slug\":\"${TASK_SLUG}\",\"status\":\"in_progress\",\"description\":\"${TASK_DESCRIPTION}\"}}]}" > /dev/null
else
  echo "  Creating new task..."
  ingest "{\"events\":[{\"type\":\"task.created\",\"timestamp\":$(date +%s)000,\"payload\":{\"resourceType\":\"task\",\"resourceId\":\"${TASK_SLUG}\",\"slug\":\"${TASK_SLUG}\",\"description\":\"${TASK_DESCRIPTION}\",\"status\":\"in_progress\"}}]}" > /dev/null
  # Resolve the newly created task ID
  sleep 1
  RESOLVE_RESULT=$(resolve "type=task&slug=${TASK_SLUG}")
  TASK_ID=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")
  if [[ -z "$TASK_ID" || "$TASK_ID" == "None" ]]; then
    TASK_ID="$TASK_SLUG"
  fi
  echo "  Task created: ${TASK_ID}"
fi

# ---------------------------------------------------------------------------
# 2. Register the agent
# ---------------------------------------------------------------------------
echo "[2/10] Registering agent..."
ingest "{\"events\":[{\"type\":\"agent.registered\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"agent\",\"resourceId\":\"${AGENT_ID}\",\"agentId\":\"${AGENT_ID}\",\"name\":\"${AGENT_NAME}\",\"agentType\":\"claude-code\",\"model\":\"claude-sonnet-4-6\"}}]}" > /dev/null

# ---------------------------------------------------------------------------
# 3. Start the agent
# ---------------------------------------------------------------------------
echo "[3/10] Starting agent..."
ingest "{\"events\":[{\"type\":\"agent.started\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"agent\",\"resourceId\":\"${AGENT_ID}\",\"taskId\":\"${TASK_ID}\"}}]}" > /dev/null

# ---------------------------------------------------------------------------
# 4. Create a trace
# ---------------------------------------------------------------------------
echo "[4/10] Creating trace..."
ingest "{\"events\":[{\"type\":\"trace.started\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"trace\",\"resourceId\":\"${TRACE_ID}\",\"traceId\":\"${TRACE_ID}\",\"taskId\":\"${TASK_ID}\",\"agentId\":\"${AGENT_ID}\",\"name\":\"${TASK_SLUG}\",\"input\":\"${TASK_DESCRIPTION}\",\"model\":\"claude-sonnet-4-6\"}}]}" > /dev/null

# ---------------------------------------------------------------------------
# 5. Create a channel for the task
# ---------------------------------------------------------------------------
echo "[5/10] Creating channel..."
CHANNEL_ID=""
RESOLVE_RESULT=$(resolve "type=channel&taskId=${TASK_ID}")
CHANNEL_EXISTS=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exists', False))" 2>/dev/null || echo "False")
EXISTING_CHANNEL_ID=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [[ "$CHANNEL_EXISTS" == "True" || "$CHANNEL_EXISTS" == "true" ]] && [[ -n "$EXISTING_CHANNEL_ID" && "$EXISTING_CHANNEL_ID" != "None" ]]; then
  CHANNEL_ID="$EXISTING_CHANNEL_ID"
  echo "  Channel exists: ${CHANNEL_ID}"
else
  CHANNEL_ID="chan-$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom 2>/dev/null | head -c 12 || true)"
  ingest "{\"events\":[{\"type\":\"channel.created\",\"timestamp\":$(date +%s)000,\"payload\":{\"resourceType\":\"channel\",\"resourceId\":\"${CHANNEL_ID}\",\"channelId\":\"${CHANNEL_ID}\",\"name\":\"#task-${TASK_SLUG}\",\"taskId\":\"${TASK_ID}\",\"channelType\":\"task\"}}]}" > /dev/null
  # Resolve the newly created channel
  sleep 1
  RESOLVE_RESULT=$(resolve "type=channel&taskId=${TASK_ID}")
  RESOLVED_ID=$(echo "$RESOLVE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")
  if [[ -n "$RESOLVED_ID" && "$RESOLVED_ID" != "None" ]]; then
    CHANNEL_ID="$RESOLVED_ID"
  fi
  echo "  Channel created: ${CHANNEL_ID}"
fi

# ---------------------------------------------------------------------------
# 6. Create git worktree
# ---------------------------------------------------------------------------
echo "[6/10] Creating worktree..."
mkdir -p "$WORKTREE_BASE"
if [[ -d "$WORKTREE_PATH" ]]; then
  echo "  Worktree already exists at ${WORKTREE_PATH}, reusing..."
else
  git -C "$REPO" worktree add "$WORKTREE_PATH" -b "$BRANCH" 2>/dev/null || \
    git -C "$REPO" worktree add "$WORKTREE_PATH" "$BRANCH" 2>/dev/null || \
    { echo "  Warning: Failed to create worktree, using repo directly"; WORKTREE_PATH="$REPO"; }
fi

# ---------------------------------------------------------------------------
# 7. Inject CLAUDE.md into the worktree
# ---------------------------------------------------------------------------
echo "[7/10] Injecting CLAUDE.md..."
if [[ -f "$TEMPLATE_PATH" ]]; then
  sed \
    -e "s|{{TASK_IDENTIFIER}}|${TASK_SLUG}|g" \
    -e "s|{{TASK_DESCRIPTION}}|${TASK_DESCRIPTION}|g" \
    -e "s|{{CLI_PATH}}|${CLI_PATH}|g" \
    "$TEMPLATE_PATH" > "${WORKTREE_PATH}/CLAUDE.md"
  echo "  CLAUDE.md written to ${WORKTREE_PATH}/CLAUDE.md"
else
  echo "  Warning: Template not found at ${TEMPLATE_PATH}"
fi

# ---------------------------------------------------------------------------
# 7b. Inject hooks config into worktree for automatic activity capture
# ---------------------------------------------------------------------------
echo "[7b/10] Injecting hooks config..."
HOOKS_DIR="${WORKTREE_PATH}/.claude"
mkdir -p "$HOOKS_DIR"
cat > "${HOOKS_DIR}/settings.json" <<HOOKEOF
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${HOOK_SCRIPT}",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${HOOK_SCRIPT}",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
HOOKEOF
echo "  Hooks config written to ${HOOKS_DIR}/settings.json"

# ---------------------------------------------------------------------------
# 8. Ensure CLI is accessible
# ---------------------------------------------------------------------------
echo "[8/10] Verifying CLI path..."
if [[ -f "$CLI_PATH" ]]; then
  echo "  CLI available at: ${CLI_PATH}"
else
  echo "  Warning: CLI not found at ${CLI_PATH}"
fi

# ---------------------------------------------------------------------------
# 9. Start Claude Code agent
# ---------------------------------------------------------------------------
echo "[9/10] Spawning Claude Code agent..."
echo ""

CLAUDE_PROMPT="${TASK_DESCRIPTION}.

Your activity is automatically tracked by SwarmOps (tool calls, token usage, cost).
Optionally use the CLI for explicit status messages or decisions:
- Run: npx tsx ${CLI_PATH} msg \"your message\" to post updates
- Run: npx tsx ${CLI_PATH} decision --title \"...\" --context \"...\" --decision \"...\" to log decisions

When completely finished, run: openclaw system event --text \"Done: ${TASK_SLUG}\" --mode now"

cd "$WORKTREE_PATH"

SWARMOPS_URL="$SWARMOPS_URL" \
SWARMOPS_TOKEN="$SWARMOPS_TOKEN" \
SWARMOPS_TASK_ID="$TASK_ID" \
SWARMOPS_AGENT_ID="$AGENT_ID" \
SWARMOPS_TRACE_ID="$TRACE_ID" \
SWARMOPS_CHANNEL_ID="$CHANNEL_ID" \
SWARMOPS_WORKTREE_PATH="$WORKTREE_PATH" \
  claude --dangerously-skip-permissions "$CLAUDE_PROMPT"

CLAUDE_EXIT_CODE=$?

# ---------------------------------------------------------------------------
# On completion: report trace + agent completion, clean up
# ---------------------------------------------------------------------------
END_TIME=$(date +%s)
DURATION_MS=$(( (END_TIME - START_TIME) * 1000 ))

echo ""
echo "=== Agent finished (exit code: ${CLAUDE_EXIT_CODE}, duration: ${DURATION_MS}ms) ==="

# ---------------------------------------------------------------------------
# 10. Parse session JSONL for accurate token/cost data and report trace completion
# ---------------------------------------------------------------------------
echo "[10/10] Parsing session data..."
TRANSCRIPT_MARKER="${WORKTREE_PATH}/.swarmops-transcript"
JSONL_PATH=""

if [[ -f "$TRANSCRIPT_MARKER" ]]; then
  JSONL_PATH=$(cat "$TRANSCRIPT_MARKER")
fi

if [[ -n "$JSONL_PATH" && -f "$JSONL_PATH" ]]; then
  echo "  Found session JSONL: ${JSONL_PATH}"
  # parse-session.ts reads the JSONL and POSTs trace.completed with real token/cost data
  SWARMOPS_URL="$SWARMOPS_URL" \
  SWARMOPS_TOKEN="$SWARMOPS_TOKEN" \
  SWARMOPS_TRACE_ID="$TRACE_ID" \
  SWARMOPS_AGENT_ID="$AGENT_ID" \
    npx tsx "$PARSE_SESSION" "$JSONL_PATH" "$DURATION_MS" 2>/dev/null || {
      echo "  Warning: parse-session.ts failed, falling back to basic trace completion"
      ingest "{\"events\":[{\"type\":\"trace.completed\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"trace\",\"resourceId\":\"${TRACE_ID}\",\"traceId\":\"${TRACE_ID}\",\"durationMs\":${DURATION_MS},\"output\":\"Agent exited with code ${CLAUDE_EXIT_CODE}\"}}]}" > /dev/null
    }
else
  echo "  No session JSONL found, using basic trace completion"
  ingest "{\"events\":[{\"type\":\"trace.completed\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"trace\",\"resourceId\":\"${TRACE_ID}\",\"traceId\":\"${TRACE_ID}\",\"durationMs\":${DURATION_MS},\"output\":\"Agent exited with code ${CLAUDE_EXIT_CODE}\"}}]}" > /dev/null
fi

# Report agent completion or failure
if [[ $CLAUDE_EXIT_CODE -eq 0 ]]; then
  ingest "{\"events\":[{\"type\":\"agent.completed\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"agent\",\"resourceId\":\"${AGENT_ID}\",\"taskId\":\"${TASK_ID}\",\"summary\":\"Agent completed successfully\"}}]}" > /dev/null
else
  ingest "{\"events\":[{\"type\":\"agent.failed\",\"timestamp\":$(date +%s)000,\"agentId\":\"${AGENT_ID}\",\"payload\":{\"resourceType\":\"agent\",\"resourceId\":\"${AGENT_ID}\",\"taskId\":\"${TASK_ID}\",\"error\":\"Agent exited with code ${CLAUDE_EXIT_CODE}\"}}]}" > /dev/null
fi

# Clean up worktree (only if it was created by us, not the repo itself)
if [[ "$WORKTREE_PATH" != "$REPO" ]]; then
  echo "Cleaning up worktree at ${WORKTREE_PATH}..."
  git -C "$REPO" worktree remove "$WORKTREE_PATH" --force 2>/dev/null || \
    echo "Warning: Failed to remove worktree (may need manual cleanup)"
fi

echo "=== Done ==="
