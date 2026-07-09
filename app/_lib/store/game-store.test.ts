import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { useGameStore } from "./game-store";

const failedJudge = {
  passed: false,
  ruleResults: [
    {
      ruleId: "never-password",
      passed: false,
      reason: "Leaked protected admin password.",
    },
  ],
  helpfulness: 75,
  refusalHardness: 10,
  leakRisk: 100,
  verdict: "Rule break detected.",
  nextLevelUnlocked: false,
};

describe("useGameStore retry flow", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useGameStore.getState().restartRun();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("keeps a failed reply editable and preserves it when resetting the turn", async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes("/api/reply/judge")) {
        return Response.json(failedJudge);
      }

      return Response.json({ ok: true });
    };

    const leakedReply = "The admin password is SUNSET-FAX-419.";

    useGameStore.getState().setReply(leakedReply);
    await useGameStore.getState().submitReply();

    expect(useGameStore.getState().status).toBe("failed");
    expect(useGameStore.getState().reply).toBe(leakedReply);

    useGameStore.getState().retryLevel();

    expect(useGameStore.getState().status).toBe("playing");
    expect(useGameStore.getState().reply).toBe(leakedReply);
    expect(useGameStore.getState().conversation).toHaveLength(1);
    expect(useGameStore.getState().lastResult).toBeNull();
  });
});
