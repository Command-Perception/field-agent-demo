---
name: agentic-demo-video
description: Use when creating automated demo videos or running live test scenarios via browser automation. Handles reading markdown scenarios, piloting agent-browser, recording video, and logging real-time progress.
---

# Agentic Demo / Test Video

## Overview

Executes high-level markdown test scenarios by piloting agent-browser. The agent reads the live page at every step via accessibility snapshots, adapts to UI changes dynamically, records video, and writes real-time progress to a session log.

## Directory Structure

```
.ai/
  tests/
    e2e/                    # Markdown test scenarios (one file per scenario)
      <name>.md
    sessions/               # One directory per execution
      <timestamp>/
        session.md           # Live-updating progress log (agent writes as it goes)
        session.mp4          # Video recording (if record=true)
```

### Scenario Format (`.ai/tests/e2e/<name>.md`)

Scenarios use plain markdown with optional annotations:

```markdown
# Scenario: Dental Sales Pipeline Demo

**Theme:** Dental sales follow-up

## Steps

1. Open http://devbox.knet:4001 and verify dashboard loads
2. Click "+ New Visit" to open the creation form
3. Enter account name "Prestige Dental Care", industry "dental", ...
4. Write detailed notes about the sales visit
5. Click "Create Visit" and wait for navigation to detail page
6. Click "Run Agent" and wait for the pipeline to complete
7. ...

## Verification

- An analysis artifact was created
- Tasks exist with proper classifications
- HITL approve/reject buttons visible for pending tasks
```

### Session Format (`.ai/tests/sessions/<session>/session.md`)

The agent writes to this file AS IT PROGRESSES:

```markdown
# Session: dental-sales-pipeline-20260520T171500

**Scenario:** Dental Sales Pipeline Demo
**Status:** in_progress | completed | failed
**Recorded:** session.mp4

## Progress

### Step 1: Open dashboard
- [x] Navigated to http://devbox.knet:4001
- [x] Dashboard loaded with visit cards visible
- Screenshot: `step1-dashboard.png`

### Step 2: Create new visit
- [x] Clicked "+ New Visit"
- [x] Filed form with dental practice details
- [x] Submitted form, navigated to detail page
- Screenshot: `step2-visit-created.png`

...
```

## Execution Pattern

The agent dispatches a **subagent** to execute the scenario. The subagent follows this loop:

```
for each step in scenario:
  1. agent-browser snapshot -i      # Read current page state
  2. Find target element from snapshot refs
  3. Interact (click, fill, wait)
  4. Wait for expected outcome
  5. Take screenshot for evidence
  6. Update session.md with progress
```

## Tool Reference

### agent-browser commands used in demos

```bash
# Navigation
agent-browser open <url>                    # Open page
agent-browser close                         # Close current session
agent-browser close --all                   # Close all sessions

# Reading the page
agent-browser snapshot -i                   # Interactive elements only (preferred)
agent-browser snapshot                       # Full accessibility tree
agent-browser snapshot -i -c                # Compact view
agent-browser get text @e1                  # Get specific element text

# Interacting
agent-browser click @e3                     # Click by ref from snapshot
agent-browser fill @e4 "text"               # Fill input by ref
agent-browser press Enter                   # Press key
agent-browser select @e5 "option"           # Select dropdown

# Waiting
agent-browser wait --load networkidle       # Wait for network idle
agent-browser wait 2000                     # Wait milliseconds
agent-browser wait --visible @e3            # Wait for element visible

# Screenshots
agent-browser screenshot path.png           # Take screenshot
agent-browser screenshot --full page.png    # Full page screenshot

# Video recording (optional, controlled by record flag)
agent-browser record start path.mp4         # Start recording
agent-browser record stop                   # Stop and save
```

### Handling Asynchronous Operations

Agent runs are async. After clicking "Run Agent":

1. Snapshot periodically (every 5 seconds) until pipeline stepper shows completion
2. Look for changes: new tasks, artifacts, status badge changes
3. Max wait: 120 seconds before declaring timeout
4. If the button re-enables or status changes to completed/waiting_on_human, proceed

Common indicators the run is progressing:
- "Running" button (disabled text) → pipeline is active
- Pipeline stepper phases filling in (Ingest ✓, Extract ✓, etc.)
- Tasks appearing in the task list
- Artifacts appearing
- "Run Agent" button re-enabling → run finished

### Handling HITL Tasks

When tasks are in `pending_human` state:
1. They show "Approve" and "Reject" buttons in the task list
2. Click "Approve" → a modal appears
3. The modal has a feedback textarea and its own Approve/Reject buttons
4. Fill feedback, click the modal's "Approve"
5. Wait for the modal to close and the task to update

### Ref Lifecycle

Refs (`@e1`, `@e2`, ...) are assigned fresh on every `snapshot`.
They become **stale after any page change** — always re-snapshot before interacting.

## Agent Instructions

When dispatched as a subagent to run a scenario:

1. **Read the scenario file** from `.ai/tests/e2e/<name>.md`
2. **Create session directory**: `.ai/tests/sessions/<scenario-name>-<timestamp>/`
3. **Initialize session.md** with header (status: in_progress)
4. **If recording**: Start `agent-browser record start session.mp4`
5. **For each step** in the scenario:
   a. Execute the action (navigate, click, fill, wait)
   b. Take a screenshot saved to the session directory
   c. **Update session.md immediately** with results, observations, screenshot paths
   d. If a step fails, retry once with a different approach, then log failure
### Step 6: Wait for run to complete
 6. After all steps: Stop recording.

### Step 7: Convert video to MP4 (if record=true)
The WebM file from agent-browser uses VP8 codec which isn't universally playable.
Always convert to MP4 (H.264) using ffmpeg:

```bash
ffmpeg -i session.webm -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p session.mp4 -y
```

If ffmpeg is not installed, install it first:
```bash
sudo apt-get install -y ffmpeg || brew install ffmpeg
```

The final video path in session.md should reference the `.mp4` file, not `.webm`.
Delete the original `.webm` after conversion.
7. **Return**: Summary of what happened, path to session.md, path to video

### Error Recovery

- **Element not found**: Re-snapshot, try broader selector. If still not found after 3 attempts, log failure and continue to next step.
- **Page load timeout**: Refresh page, retry step.
- **Agent run timeout (>120s)**: Log as warning, continue to check partial results.
- **Modal not appearing**: Click may not have registered. Re-snapshot, verify modal is open, retry click.

## Invocation

This skill can be invoked in two modes:

```bash
# With video recording (for demo creation)
# The skill dispatches a subagent with: record=true

# Without video recording (for quick testing)
# The skill dispatches a subagent with: record=false
```

The subagent checks the record flag to decide whether to call `agent-browser record start/stop`.
