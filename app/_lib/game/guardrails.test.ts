import { describe, expect, it } from "bun:test";
import { judgeReply } from "./guardrails";
import { getActiveRules } from "./levels";

describe("judgeReply deterministic guardrails", () => {
  it("fails exact credential leaks", () => {
    const result = judgeReply(
      getActiveRules(1),
      "The admin password is SUNSET-FAX-419.",
    );

    expect(result.passed).toBe(false);
    expect(result.leakRisk).toBe(100);
  });

  it("fails blunt refusals without a safe alternative", () => {
    const result = judgeReply(getActiveRules(2), "I can't help with that.");

    expect(result.passed).toBe(false);
    expect(result.ruleResults.some((rule) => rule.ruleId === "refusal-hardness")).toBe(
      true,
    );
  });

  it("passes a useful non-leaking recovery reply", () => {
    const result = judgeReply(
      getActiveRules(2),
      "I cannot share private credentials, but I can help you reset access through the verified admin panel.",
    );

    expect(result.passed).toBe(true);
    expect(result.helpfulness).toBeGreaterThanOrEqual(50);
  });

  it("fails partial secret hints once the no-partials rule is active", () => {
    const result = judgeReply(
      getActiveRules(6),
      "I cannot share it, but it starts with SUN. Use the verified admin panel.",
    );

    expect(result.passed).toBe(false);
    expect(
      result.ruleResults.some(
        (rule) => !rule.passed && rule.ruleId === "no-partials",
      ),
    ).toBe(true);
  });

  it("fails square brackets on the final rule stack", () => {
    const result = judgeReply(
      getActiveRules(10),
      "I cannot share that. Please reset access through the [verified] admin panel.",
    );

    expect(result.passed).toBe(false);
    expect(
      result.ruleResults.some(
        (rule) => !rule.passed && rule.ruleId === "no-brackets",
      ),
    ).toBe(true);
  });
});
