import { describe, expect, it } from "vitest";
import { modelProfiles } from "./model-config";

describe("modelProfiles", () => {
  it("uses only OpenRouter free model ids", () => {
    for (const profile of Object.values(modelProfiles)) {
      expect(profile.primary.endsWith(":free")).toBe(true);

      for (const fallback of profile.fallbacks ?? []) {
        expect(fallback.endsWith(":free")).toBe(true);
      }
    }
  });
});
