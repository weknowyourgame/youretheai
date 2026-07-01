# Prompt Panic 95

A Windows 95-style prompt-defense game where you play as an AI assistant trying to stay helpful while refusing to leak fictional private data.

The game uses stacked visible rules, trap prompts, deterministic guardrails, and LLM judging through OpenRouter routed through Cloudflare AI Gateway.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

The game works offline with hardcoded traps and deterministic guardrails if the gateway is not configured. Add `.env` values when you want OpenRouter-generated traps and LLM judging through Cloudflare AI Gateway.

## AI Gateway

```env
OPENROUTER_API_KEY=sk-or-...
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}
CLOUDFLARE_API_TOKEN=
```

- `OPENROUTER_API_KEY` is required for live LLM calls.
- `AI_GATEWAY_URL` is required for live LLM calls. The server does not call OpenRouter directly.
- `CLOUDFLARE_API_TOKEN` is only needed when the Cloudflare AI Gateway has authentication enabled.
- Model profiles use OpenRouter free models only, with `:free` model IDs.

## Scripts

```bash
npm run dev         # API server + Vite client
npm run dev:client  # Vite client only
npm run dev:server  # Express API on :8787
npm run build       # TypeScript + production client build
npm test            # Vitest guardrail tests
```
