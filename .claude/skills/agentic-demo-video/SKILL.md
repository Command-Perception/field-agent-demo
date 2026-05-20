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
    e2e/                    # Markdown test scenarios
      <name>.md
    sessions/               # One directory per execution
      <timestamp>/
        session.md           # Live-updating progress log
        session.mp4          # Video recording (if record=true)
```

### Scenario Format

Scenarios use frontmatter for configuration and markdown for steps:

```markdown
# Scenario: Name

**Viewport:** 1440x900           # Browser viewport (default: 1440x900)
**Record:** true                  # Record video (default: true)
**Max duration:** 180            # Max seconds for async waits

## Steps

1. Open http://devbox.knet:4001
2. Click "+ New Visit"
...
```

### Session Format

The agent writes to `session.md` AS IT PROGRESSES — every action triggers an update:

```markdown
# Session: name-timestamp

**Scenario:** Name
**Status:** in_progress | completed | failed
**Viewport:** 1440x900

## Progress

### Step 1: Open dashboard
- [x] Navigated to URL
- [x] Dashboard loaded
- Screenshot: step1-dashboard.png
```

## Core Execution Flow

```
1. Read scenario → extract viewport, record flag, max duration
2. Create session directory
3. Open browser:  agent-browser open <url>
4. Set viewport:  agent-browser set viewport <W> <H>
5. Start record:  agent-browser record start session.mp4  (if record=true)
6. For each step:
   a. agent-browser snapshot -i         # Read live page state
   b. Find element refs, interact       # click, fill, wait
   c. agent-browser screenshot path.png  # Evidence
   d. Update session.md                  # Log NOW
7. Stop: agent-browser record stop
8. Convert WebM → MP4 via ffmpeg        # (if record=true)
9. Write final status to session.md
```

## Tool Reference

```bash
agent-browser open <url>                    # Open page
agent-browser close                         # Close session
agent-browser close --all                   # Close all sessions

agent-browser set viewport <w> <h>          # Set browser viewport size (call after open)
agent-browser snapshot -i                   # Interactive elements (use this)
agent-browser snapshot -i -c                # Compact view

agent-browser click @e3                     # Click by ref
agent-browser fill @e4 "text"              # Fill input
agent-browser press Enter                   # Press key

agent-browser wait --load networkidle       # Wait for network idle
agent-browser wait 2000                     # Wait ms
agent-browser screenshot path.png           # Take screenshot
agent-browser record start path.mp4         # Start video recording
agent-browser record stop                   # Stop and save
```

## Handling Async Operations

After "Run Agent": snapshot every 10s. Look for pipeline stepper phases, tasks appearing, status badge changing. Max wait = scenario's `Max duration` or 120s default.

## Handling HITL Tasks

Pending tasks show Approve/Reject buttons. Click Approve → modal appears → fill feedback → click modal's Approve → wait for modal to close.

## Video Post-Processing

agent-browser records WebM (VP8 codec). Always convert to MP4 (H.264):

```bash
ffmpeg -i session.webm -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p session.mp4 -y
rm session.webm
```

Install ffmpeg: `sudo apt-get install -y ffmpeg || brew install ffmpeg`

## Agent Instructions

When dispatched as a subagent:

1. **Read scenario file** from `.ai/tests/e2e/<name>.md`
2. **Extract config**: viewport (default 1440x900), record flag (default true), max duration (default 120)
3. **Create session dir**: `.ai/tests/sessions/<name>-<timestamp>/`
4. **Initialize session.md** with header (status: in_progress, viewport config)
5. **Open browser**: `agent-browser open <first-url>`
6. **Set viewport**: `agent-browser set viewport <W> <H>`
7. **Start recording**: `agent-browser record start session.webm` (if record=true)
8. **For each step** in the scenario:
   a. `agent-browser snapshot -i` to find current element refs
   b. Interact using refs
   c. `agent-browser screenshot step<N>.png`
   d. **Update session.md immediately** with result, observations, screenshot path
   e. If a step fails, retry once with different approach, then log failure
9. **Stop recording**: `agent-browser record stop` (if record=true)
10. **Convert video**: `ffmpeg ... session.webm session.mp4 && rm session.webm` (if record=true)
11. **Write final status** to session.md (completed or failed)
12. **Return**: summary, session.md path, session.mp4 path

### Error Recovery

- **Element not found**: Re-snapshot, try broader. 3 attempts max, then log failure and continue.
- **Page load timeout**: Refresh, retry.
- **Agent run timeout**: Log warning, check partial results.
- **Modal not appearing**: Re-snapshot, verify modal state, retry click.

## Invocation

Invokable in two modes — controlled by the scenario's `Record:` field:

- **record: true** — Full demo with video recording + MP4 conversion
- **record: false** — Quick test run, no video (faster)
