---
name: crofai-models
description: Use when configuring AI model selection for the agent pipeline or understanding which CrofAI models are available through the Anthropic-compatible proxy endpoint.
---

# CrofAI Models

## Overview

This project uses **CrofAI** (`https://crof.ai`) as the AI provider. Their Anthropic-compatible endpoint at `https://anthropic.nahcrof.com` is a **transparent proxy** — it accepts the Anthropic SDK message format and routes to any supported model by model ID. No SDK changes needed to switch models.

## Configuration

All model settings are controlled via environment variables in `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `CROFAI_API_KEY` | (required) | API key for both endpoints |
| `ANTHROPIC_BASE_URL` | `https://anthropic.nahcrof.com` | API endpoint (Anthropic-compatible proxy) |
| `ANTHROPIC_MODEL` | `deepseek-v4-flash` | Model ID to route to |

The API key is stored in the local auth file and loaded via `opencode.json` plugin config. It is never committed to the repository.

## Available Models

Run this to see the current model list from the CrofAI API:

```bash
curl -s https://crof.ai/api/models | jq '.data[] | {id, name}'
```

Or check the local cache at `~/.cache/opencode/crofai-models.json`.

Key models available (as of 2026-05-20):

| Model ID | Name | Cost (in/out per 1M tokens) | Tool calls |
|----------|------|---------------------------|------------|
| `deepseek-v4-flash` | DeepSeek V4 Flash | $0.12 / $0.21 | Yes |
| `deepseek-v4-pro` | DeepSeek V4 Pro | $0.40 / $0.85 | Yes |
| `glm-5.1` | GLM 5.1 | $0.45 / $2.10 | Yes |
| `glm-4.7-flash` | GLM 4.7 Flash | $0.04 / $0.30 | Yes |
| `qwen3.5-397b-a17b` | Qwen3.5 397B A17B | $0.35 / $1.75 | Yes |
| `kimi-k2.6` | Kimi K2.6 | $0.50 / $1.99 | Yes |
| `minimax-m2.5` | MiniMax M2.5 | $0.11 / $0.95 | Yes |
| `mimo-v2.5-pro` | MiMo V2.5 Pro | $0.50 / $1.50 | Yes |

## Usage

To switch models, update the `.env` file:

```bash
# .env
ANTHROPIC_MODEL=deepseek-v4-flash
```

No code changes needed. The Anthropic SDK client at `src/agent/client.ts` uses `ANTHROPIC_MODEL` env var and passes it through to the proxy endpoint.

## Architecture

```
Agent Engine (Anthropic SDK)
  → anthropic.messages.create({ model: ANTHROPIC_MODEL, ... })
    → https://anthropic.nahcrof.com/v1/messages  (transparent proxy)
      → https://crof.ai (routes to model by ID)
```

The proxy accepts the standard Anthropic Messages API format including:
- `system` prompt (top-level parameter)
- `messages` array with `user`/`assistant` roles
- `tools` array with `name`, `description`, `input_schema`
- `tool_use` content blocks in responses

## Tool Format Compatibility

The CrofAI proxy handles the Anthropic tool format natively. Tools are defined in `src/agent/tools.ts` using the Anthropic `Tools.Tool` type:

```typescript
{
  name: "tool_name",
  description: "What the tool does",
  input_schema: {
    type: "object",
    properties: { ... },
    required: ["field1"],
  },
}
```

This works identically across all supported models.

## API Key

The key `nahcrof_iMQIjPlktWoFWzIcVLYe` is stored in `~/.local/share/opencode/auth.json` under the `crofai` provider entry. It is loaded by the opencode plugin `oc-crofai` and injected into the environment.
