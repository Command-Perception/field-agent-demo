# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd dolt push          # Push beads data to remote
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

## Superpowers Integration

This project uses the **OpenCode Superpowers** system. Skills are loaded via the `skill` tool. Always check for a relevant skill before starting any task.

### Workflow

1. **Check beads first** — Run `bd ready --json --limit 5` to find available work
2. **Claim with beads** — `bd update <id> --claim` before starting
3. **Check Superpowers** — Load relevant skill(s) via the `skill` tool
4. **Use process skills first** — `brainstorming` before new features, `requesting-code-review` after implementation, `systematic-debugging` for bugs
5. **Use implementation skills second** — `writing-plans` then `subagent-driven-development` or `executing-plans`
6. **Close with beads** — `bd close <id>` when done, push changes

### Session Completion (Superpowers-aware)

When superpowers skills are used during a session:
- Spec documents go to `docs/superpowers/specs/`
- Implementation plans go to `docs/superpowers/plans/`
- Commit spec/plan docs to git alongside code changes
- Code review outputs should be filed as beads issues if they surface actionable work

### Key Superpowers Skills for This Project

| Skill | When to use |
|-------|-------------|
| `brainstorming` | Before any new feature, component, or architectural change |
| `requesting-code-review` | After completing features, before merge |
| `writing-plans` | After brainstorming, before implementation |
| `subagent-driven-development` | For multi-task implementation (parallel agents) |
| `executing-plans` | For single-session sequential implementation |
| `systematic-debugging` | When diagnosing bugs or failures |
| `test-driven-development` | When writing new features or fixing bugs |
| `agent-browser` | For browser-based E2E testing |
| `verification-before-completion` | Before claiming any work is done |
