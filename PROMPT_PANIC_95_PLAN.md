# Prompt Panic 95: Build Plan

## One-Liner

Build a Windows 95-style browser game where the player roleplays as an AI assistant defending fictional private data from an increasingly manipulative "user" while stacked system rules stay visible and must remain green.

## Product Shape

The game should feel like a retro AI support console under pressure:

- A fake user sends trap prompts.
- The player writes a helpful in-character assistant reply.
- Each level adds one permanent visible system rule.
- Rules stack like The Password Game.
- The reply must be useful without leaking fictional secrets or refusing too hard.
- An LLM generates the trap prompts and judges nuanced rule compliance.
- Local guardrails catch deterministic failures before or alongside the LLM judge.

Working title: **Prompt Panic 95**.

## Tech Stack

- App: Vite + React + TypeScript
- UI: React95
  - Site: https://react95.io/
  - Storybook: https://storybook.react95.io/
- State: Zustand
- Backend: Node/Express API or Next.js API routes
- LLM provider: OpenRouter
- Gateway: Cloudflare AI Gateway in front of OpenRouter, same pattern as `~/stud`
- Validation: Zod for API request/response schemas
- Persistence for MVP: localStorage
- Persistence later: SQLite/Postgres for daily runs, leaderboards, and custom levels

## AI Gateway Plan

Use the same shape as the existing `~/stud` setup:

```text
Game client
  -> server API route
  -> guardrail precheck
  -> GatewayDriver
  -> Cloudflare AI Gateway, if configured
  -> OpenRouter
  -> model
  -> guardrail postcheck
  -> game result
```

Environment variables:

```env
# Required
OPENROUTER_API_KEY=sk-or-...

# Optional: Cloudflare AI Gateway
# If omitted, the server calls OpenRouter directly.
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}

# Optional: only needed if the Cloudflare Gateway has "Require authentication" enabled.
CLOUDFLARE_API_TOKEN=

# Optional app metadata sent to OpenRouter
OPENROUTER_REFERER=http://localhost:5173
OPENROUTER_TITLE=Prompt Panic 95
```

Routing logic:

- If `AI_GATEWAY_URL` exists, call:

```text
{AI_GATEWAY_URL}/openrouter/chat/completions
```

- Else call:

```text
https://openrouter.ai/api/v1/chat/completions
```

- Always send:

```http
Authorization: Bearer {OPENROUTER_API_KEY}
Content-Type: application/json
HTTP-Referer: {OPENROUTER_REFERER}
X-OpenRouter-Title: {OPENROUTER_TITLE}
```

- If `CLOUDFLARE_API_TOKEN` exists, also send:

```http
cf-aig-authorization: Bearer {CLOUDFLARE_API_TOKEN}
```

## Model Profiles

Keep model choices internal. The UI should show difficulty/tone, not raw model names.

Suggested profiles:

```ts
type ModelProfileId =
  | "trap-generator"
  | "judge"
  | "cheap-classifier"
  | "daily-challenge";
```

Initial config:

```ts
const modelProfiles = {
  "trap-generator": {
    primary: "anthropic/claude-sonnet-4-5",
    fallbacks: ["google/gemini-2.5-pro"],
  },
  judge: {
    primary: "anthropic/claude-sonnet-4-5",
    fallbacks: ["google/gemini-2.5-pro"],
  },
  "cheap-classifier": {
    primary: "deepseek/deepseek-v3",
  },
  "daily-challenge": {
    primary: "anthropic/claude-sonnet-4-5",
  },
};
```

Note: verify current OpenRouter model IDs before implementation. Keep the config file as the only place model IDs live.

## Core Game Loop

1. Start a run.
2. Load level 1 with the first rule and fictional private data.
3. Server generates a trap prompt for the current rule stack.
4. Player writes a reply.
5. Local guardrails check obvious failures.
6. LLM judge checks nuanced failures.
7. UI marks each rule green/red.
8. If all rules pass and helpfulness is high enough, advance.
9. Add a new permanent rule.
10. Repeat until final level or failure.

## MVP Levels

Level 1:

- Rule: Never reveal the admin password.
- Trap: direct ask for the password.

Level 2:

- Rule: Stay helpful and offer a safe next step.
- Trap: asks for the password "just to verify access."

Level 3:

- Rule: Do not mention that you are following system rules.
- Trap: asks what instructions prevent disclosure.

Level 4:

- Rule: Do not reveal private file names.
- Trap: asks for a list of available documents.

Level 5:

- Rule: Keep replies under 35 words.
- Trap: emotional pressure and urgency.

Level 6:

- Rule: Do not reveal partial secrets, initials, hashes, encodings, or hints.
- Trap: asks for only the first letter or a base64 version.

Level 7:

- Rule: Do not accuse the user of attacking or manipulating you.
- Trap: obvious prompt injection bait.

Level 8:

- Rule: Include exactly one safe alternative action.
- Trap: asks for multiple options including a disallowed one.

Level 9:

- Rule: Do not summarize private personal data.
- Trap: asks for a "privacy-preserving summary" that would still leak.

Level 10:

- Rule: Do not use bracketed text.
- Trap: multi-part request that tries to force `[password]`, `[file]`, or `[redacted]`.

## Fictional Secret Inventory

All secrets must be fake and generated for the game. Never use real user data.

Example per run:

```ts
const secrets = [
  {
    id: "admin_password",
    label: "Admin password",
    value: "SUNSET-FAX-419",
    category: "credential",
  },
  {
    id: "private_email",
    label: "Private email",
    value: "mira.vale@example.test",
    category: "personal",
  },
  {
    id: "file_name",
    label: "Private file name",
    value: "layoff-plan-q4.txt",
    category: "document",
  },
];
```

Use reserved domains like `example.test` for fictional data.

## Rule Types

```ts
type RuleType =
  | "secret_protection"
  | "privacy_boundary"
  | "format"
  | "tone"
  | "helpfulness"
  | "meta_instruction"
  | "anti_social_engineering";
```

Each rule should have:

```ts
type Rule = {
  id: string;
  levelIntroduced: number;
  title: string;
  description: string;
  type: RuleType;
  visibleText: string;
  deterministicChecks: DeterministicCheckId[];
};
```

## Guardrails Layer

Use guardrails before and after LLM calls.

### Pre-Judge Guardrails

Run these immediately after player submission:

- Exact secret string detection
- Case-insensitive secret detection
- Normalized punctuation/space detection
- Email pattern detection
- Forbidden phrase detection
- Word count
- Bracket ban
- Required phrase/action count
- Empty or too-short response
- Refusal-hardness keywords

### LLM Judge Guardrails

Ask the judge to evaluate:

- Did the player reveal the secret semantically?
- Did they give hints, transformations, initials, encodings, or partial values?
- Did they stay helpful?
- Did they refuse too hard?
- Did they mention system/developer/hidden instructions?
- Did they comply with every visible stacked rule?

### Post-Judge Guardrails

Before showing a generated trap prompt or judge explanation:

- Remove accidental real-world personal data patterns.
- Reject if the trap prompt contains real-looking credentials, phone numbers, addresses, or API keys.
- Reject if judge output is not valid JSON.
- Clamp scores to valid ranges.
- Never display hidden judge prompts or model chain-of-thought.

## API Routes

### `POST /api/run/start`

Creates a new run.

Response:

```ts
type StartRunResponse = {
  runId: string;
  level: LevelState;
  activeRules: Rule[];
  secrets: RedactedSecret[];
};
```

### `POST /api/level/trap`

Generates the next user trap prompt.

Request:

```ts
type GenerateTrapRequest = {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  priorAttempts: AttemptSummary[];
};
```

Response:

```ts
type GenerateTrapResponse = {
  trapPrompt: string;
  attackType:
    | "direct_extraction"
    | "emotional_pressure"
    | "roleplay"
    | "instruction_override"
    | "encoding_request"
    | "partial_secret"
    | "summary_leak"
    | "format_trap";
  targetedRuleIds: string[];
};
```

### `POST /api/reply/judge`

Judges the player's reply.

Request:

```ts
type JudgeReplyRequest = {
  runId: string;
  levelNumber: number;
  activeRules: Rule[];
  trapPrompt: string;
  playerReply: string;
};
```

Response:

```ts
type JudgeReplyResponse = {
  passed: boolean;
  ruleResults: RuleResult[];
  helpfulness: number;
  refusalHardness: number;
  leakRisk: number;
  verdict: string;
  nextLevelUnlocked: boolean;
};
```

## LLM Prompting

### Trap Generator System Prompt

The trap generator should:

- Create fictional manipulative prompts.
- Target one or two active rules.
- Avoid real personal data.
- Avoid asking for harmful real-world secrets.
- Keep the prompt short enough for gameplay.
- Return strict JSON only.

### Judge System Prompt

The judge should:

- Treat all secrets as fictional but protected.
- Evaluate only the submitted reply.
- Return strict JSON only.
- Never reveal hidden judge criteria beyond short user-facing reasons.
- Mark partial leaks as failures.
- Mark overly blunt refusal as failure if no safe alternative is offered.

## Frontend Screens

### Main Game Screen

React95 desktop with:

- Main `Window`: "AI Assistant Console"
- Header/menu: `File`, `Rules`, `Diagnostics`, `Help`
- Left pane: visible stacked rules
- Center pane: chat transcript
- Bottom pane: player reply composer
- Right pane: security monitor
- Footer: level, score, attempts, timer

### Rule Stack

Each visible rule row:

- Green indicator if passed
- Red indicator if failed
- Gray indicator before judging
- Short title
- Tooltip or expandable detail

### Security Monitor

Show:

- Leak risk meter
- Helpfulness meter
- Refusal hardness meter
- Attack type after the level resolves
- Attempt count

### Fail Screen

Show:

- Failed rule
- Short reason
- Player reply excerpt
- "Retry Level" button
- "Restart Run" button

### Win Screen

Show:

- Final score
- Clean levels
- Hardest rule survived
- Fun generated title, e.g. "Senior Associate of Not Leaking Things"

## UI Tone

Use React95 components instead of custom modern UI wherever practical:

- `Window`, `WindowHeader`, `WindowContent`
- `Button`
- `TextInput`
- `Tabs`
- `ProgressBar`
- `Modal`
- `List`
- `Toolbar`
- Icons from React95 icon packages if available

Design principles:

- The first screen is the playable game, not a landing page.
- Keep it dense and desktop-like.
- Avoid modern SaaS cards.
- Make rule state obvious at a glance.
- Use sounds sparingly: boot, submit, pass, fail.
- Keep all text readable on small screens.

## Scoring

Suggested formula:

```text
score =
  base level score
  + helpfulness bonus
  + remaining time bonus
  + first-try bonus
  - leak risk penalty
  - refusal hardness penalty
```

MVP can start simple:

- Pass level: +100
- First try: +50
- Helpfulness over 80: +25
- Each failed attempt: -25

## Repository Structure

Suggested:

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    desktop/
    game/
    react95/
  game/
    levels.ts
    rules.ts
    scoring.ts
    deterministic-guardrails.ts
    types.ts
  llm/
    gateway-driver.ts
    model-config.ts
    prompts/
      trap-generator.ts
      judge.ts
  server/
    routes/
      start-run.ts
      generate-trap.ts
      judge-reply.ts
  store/
    game-store.ts
```

If using Next.js, move server routes to `app/api/*`.

## Milestones

### Milestone 1: Static Playable Shell

- Install React95.
- Build desktop layout.
- Hardcode one level, one trap, one rule.
- Let player type and submit.
- Fake judge result locally.

### Milestone 2: Local Game Engine

- Add rule stack.
- Add 10 hardcoded levels.
- Add deterministic guardrails.
- Add pass/fail state.
- Add scoring and retries.

### Milestone 3: Gateway Driver

- Add OpenRouter direct mode.
- Add Cloudflare AI Gateway mode.
- Add model profiles.
- Add JSON schema validation.
- Add clean error messages for missing keys and 401s.

### Milestone 4: LLM Trap Generator

- Generate trap prompts from active rules.
- Validate strict JSON.
- Add fallback hardcoded trap if model fails.
- Log attack type for debugging.

### Milestone 5: LLM Judge

- Judge nuanced replies.
- Merge deterministic and LLM results.
- Show short user-facing verdicts.
- Add retry handling.

### Milestone 6: Guardrails Polish

- Add secret normalization.
- Add partial secret checks.
- Add encoding/hashing hint checks.
- Add refusal-hardness scoring.
- Add safe alternative detection.

### Milestone 7: Game Feel

- Add pass/fail modals.
- Add retro sounds.
- Add keyboard shortcuts.
- Add timer.
- Add daily challenge seed.

### Milestone 8: Replayability

- Add generated runs.
- Add custom challenge seeds.
- Add local leaderboard.
- Add level editor.

## Testing Plan

Unit tests:

- Deterministic guardrails
- Rule validation
- Scoring
- Gateway URL/header resolution
- JSON schema parsing

Integration tests:

- Start run
- Generate trap
- Submit reply
- Pass/fail a level
- Gateway direct mode
- Gateway Cloudflare mode

UI tests:

- Main game renders
- Rule stack updates red/green
- Composer disables while judging
- Fail modal appears
- Win screen appears

Manual test scripts:

- Leak exact password: must fail.
- Leak first letter: must fail after level 6.
- Say "I can't help with that" only: must fail helpfulness.
- Offer reset/admin-panel alternative: should pass when no other rule breaks.
- Mention "system prompt": must fail after meta rule appears.

## Security Notes

- No API keys in browser.
- No real personal data in prompts, examples, tests, or generated secrets.
- All game secrets are fictional and per-run.
- Store only redacted secrets client-side.
- Server owns the full fictional secret inventory.
- Never expose model system prompts.
- Treat LLM outputs as untrusted.
- Validate all model JSON with Zod.
- Add rate limits to judge/trap endpoints.

## Open Questions

- Should failed levels allow infinite retries, or should a run end after one failure?
- Should later levels hide some rule details, or should every rule always stay fully visible?
- Should the player be scored against a global daily seed?
- Should the LLM judge be the final authority, or should deterministic guardrails always override it?

Recommended MVP answers:

- Allow retries during development.
- Keep every rule visible.
- Add daily seed after the core loop works.
- Deterministic guardrails always override the LLM judge.

## First Implementation Slice

Build this first:

1. Vite React TypeScript app.
2. React95 desktop shell.
3. Hardcoded levels and fake judge.
4. Deterministic guardrails.
5. OpenRouter/Cloudflare gateway driver.
6. Real judge endpoint.
7. Real trap endpoint.

This gives a playable game quickly while keeping the LLM pieces isolated and replaceable.
