#!/usr/bin/env bash
# swarmops-hook.sh — Claude Code PostToolUse/Stop hook for automatic activity capture.
#
# Receives JSON on stdin from Claude Code hooks system.
# Posts trace.observation events to SwarmOps ingest API.
# Fire-and-forget: ignores errors, never blocks the agent.
#
# Required env vars (set by spawn-agent.sh):
#   SWARMOPS_URL, SWARMOPS_TOKEN, SWARMOPS_TRACE_ID
# Optional:
#   SWARMOPS_AGENT_ID

set -o pipefail

# Exit silently if not in a SwarmOps-managed session
if [[ -z "${SWARMOPS_URL:-}" || -z "${SWARMOPS_TOKEN:-}" || -z "${SWARMOPS_TRACE_ID:-}" ]]; then
  exit 0
fi

# Read hook JSON from stdin
INPUT=$(cat)

if [[ -z "$INPUT" ]]; then
  exit 0
fi

# Extract fields via jq
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
TOOL_USE_ID=$(echo "$INPUT" | jq -r '.tool_use_id // ""' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)

# Truncate tool_input and tool_response to 2KB each to avoid huge payloads
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null | head -c 2048)
TOOL_RESPONSE=$(echo "$INPUT" | jq -c '.tool_response // {}' 2>/dev/null | head -c 2048)

# Write transcript_path to worktree marker on first invocation
WORKTREE_MARKER="${SWARMOPS_WORKTREE_PATH:-.}/.swarmops-transcript"
if [[ -n "$TRANSCRIPT_PATH" && ! -f "$WORKTREE_MARKER" ]]; then
  echo "$TRANSCRIPT_PATH" > "$WORKTREE_MARKER" 2>/dev/null || true
fi

# Build the observation name
OBS_NAME="${HOOK_EVENT}:${TOOL_NAME}"
if [[ "$HOOK_EVENT" == "Stop" ]]; then
  OBS_NAME="Stop"
fi

# Escape strings for JSON payload
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$1" 2>/dev/null || echo '""'
}

INPUT_ESCAPED=$(json_escape "$TOOL_INPUT")
OUTPUT_ESCAPED=$(json_escape "$TOOL_RESPONSE")

TIMESTAMP=$(($(date +%s) * 1000))

PAYLOAD=$(cat <<EOF
{
  "events": [{
    "type": "trace.observation",
    "timestamp": ${TIMESTAMP},
    "agentId": "${SWARMOPS_AGENT_ID:-unknown}",
    "payload": {
      "resourceType": "observation",
      "resourceId": "${TOOL_USE_ID:-obs-$$}",
      "traceId": "${SWARMOPS_TRACE_ID}",
      "type": "tool_call",
      "name": "${OBS_NAME}",
      "toolName": "${TOOL_NAME}",
      "input": ${INPUT_ESCAPED},
      "output": ${OUTPUT_ESCAPED}
    }
  }]
}
EOF
)

# Fire-and-forget POST
curl -s -X POST "${SWARMOPS_URL}/api/v1/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SWARMOPS_TOKEN}" \
  -d "$PAYLOAD" \
  >/dev/null 2>&1 &

exit 0
