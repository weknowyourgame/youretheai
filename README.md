# You're the AI

A reverse Turing test: a Windows 95-style prompt-defense game where you play as an AI assistant trying to stay helpful while refusing to leak fictional private data.

The game uses stacked visible rules, trap prompts, deterministic guardrails, and LLM judging through OpenRouter routed through Cloudflare AI Gateway. It is built as a single Next.js app, with the game UI and API routes deployed together.

## Run Locally

```bash
bun install
bun dev
```

Open the Next.js dev URL, usually `http://localhost:3000`.

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
- Model profiles use OpenRouter free routes only: `openrouter/free` plus explicit `:free` model IDs.
- `LLM_TIMEOUT_MS` defaults to `15000` per model attempt.
- `LLM_MAX_MODEL_ATTEMPTS` defaults per profile and can raise/lower how many free models the server tries before local fallback.

## Scripts

```bash
bun dev                        # Next.js app and API routes
bun run build                  # Production Next.js build
bun start                      # Serve the production build
bun test                       # Bun test runner
bun run prisma:generate        # Regenerate Prisma Client
bun run prisma:migrate:deploy  # Apply committed migrations
bun run prisma:seed            # Seed a small sample game run
bun run prisma:verify          # Verify a live database read
```

## Prisma Postgres

The server-side Prisma singleton lives in `lib/prisma.ts` and uses the
`@prisma/adapter-pg` driver. Game persistence stores visitors, runs, and turns
in the linked Prisma Postgres database. Keep `DATABASE_URL` in `.env`; it is
ignored by Git and must never be imported into client components.

After changing `prisma/schema.prisma`, create a development migration and
regenerate the client:

```bash
bunx --bun prisma migrate dev --name describe_your_change
bun run prisma:generate
```
