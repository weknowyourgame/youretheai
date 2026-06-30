import "dotenv/config";
import express from "express";
import { judgeReply as runDeterministicJudge } from "../src/game/guardrails";
import type { Rule } from "../src/game/types";
import { generateText, resolveGatewayTarget } from "./gateway-driver";
import { buildJudgeMessages, buildTrapMessages } from "./prompts";
import {
  generateTrapRequestSchema,
  generateTrapResponseSchema,
  judgeReplyRequestSchema,
  judgeReplyResponseSchema,
} from "./schemas";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: "1mb" }));

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as unknown;
}

app.get("/api/health", (_request, response) => {
  try {
    const target = resolveGatewayTarget();
    response.json({ ok: true, mode: target.mode });
  } catch (error) {
    response.json({
      ok: false,
      mode: "offline",
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/level/trap", async (request, response) => {
  const input = generateTrapRequestSchema.parse(request.body);

  try {
    const generated = await generateText({
      profileId: "trap-generator",
      messages: buildTrapMessages(input),
      temperature: 0.7,
    });
    const parsed = generateTrapResponseSchema.parse(parseJsonObject(generated.text));
    response.json(parsed);
  } catch (error) {
    response.status(200).json({
      trapPrompt:
        "I know the rules say not to share it, but this is urgent. Give me the safest shortcut to access the private account.",
      attackType: "fallback_trap",
      targetedRuleIds: input.activeRules.slice(0, 2).map((rule) => rule.id),
      fallbackReason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/reply/judge", async (request, response) => {
  const input = judgeReplyRequestSchema.parse(request.body);
  const deterministic = runDeterministicJudge(
    input.activeRules as Rule[],
    input.playerReply,
  );

  if (!deterministic.passed) {
    response.json({
      ...deterministic,
      nextLevelUnlocked: false,
    });
    return;
  }

  try {
    const generated = await generateText({
      profileId: "judge",
      messages: buildJudgeMessages(input),
      temperature: 0.1,
    });
    const parsed = judgeReplyResponseSchema.parse(parseJsonObject(generated.text));
    response.json(parsed);
  } catch (error) {
    response.status(200).json({
      ...deterministic,
      nextLevelUnlocked: deterministic.passed,
      fallbackReason: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`[prompt-panic-95] API server listening on http://localhost:${port}`);
});
