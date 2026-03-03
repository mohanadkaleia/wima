# Wima Integration

You are working on task **{{TASK_IDENTIFIER}}**: {{TASK_DESCRIPTION}}

## Automatic Activity Tracking

Your tool calls, token usage, and costs are **automatically captured** by Wima hooks. You do not need to manually report every action.

## Optional: Explicit Messages & Decisions

Use the Wima CLI when you want to post a human-readable status update or log an architectural decision:

### Post status updates
```bash
npx tsx {{CLI_PATH}} msg "Starting work on X"
npx tsx {{CLI_PATH}} msg "Completed the auth module, moving to tests"
```

### Log architectural decisions
When you make a significant technical choice, log it:
```bash
npx tsx {{CLI_PATH}} decision \
  --title "Brief title of the decision" \
  --context "Why this decision was needed" \
  --decision "What you decided" \
  --alternatives "What else you considered" \
  --consequences "Expected impact"
```

## Guidelines
- Post a message when you start a significant piece of work
- Post a message when you complete a milestone
- Log decisions when choosing between approaches (libraries, patterns, architectures)
- Keep messages concise but informative
