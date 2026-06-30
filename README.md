# Prompt Panic 95

A Windows 95-style prompt-defense game where you play as an AI assistant trying to stay helpful while refusing to leak fictional private data.

The game uses stacked visible rules, trap prompts, deterministic guardrails, and LLM judging through OpenRouter with optional Cloudflare AI Gateway routing.

## Run Locally

```bash
npm install
npm run dev:server
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

The game works offline with hardcoded traps and deterministic guardrails. Add `.env` values when you want OpenRouter-generated traps and LLM judging.

## AI Gateway

```env
OPENROUTER_API_KEY=sk-or-...
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}
CLOUDFLARE_API_TOKEN=
```

- `OPENROUTER_API_KEY` is required for live LLM calls.
- `AI_GATEWAY_URL` is optional. If it is missing, the server calls OpenRouter directly.
- `CLOUDFLARE_API_TOKEN` is only needed when the Cloudflare AI Gateway has authentication enabled.

## Scripts

```bash
npm run dev         # Vite client
npm run dev:server  # Express API on :8787
npm run build       # TypeScript + production client build
npm test            # Vitest guardrail tests
```
