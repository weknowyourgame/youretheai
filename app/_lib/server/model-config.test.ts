import { describe, expect, it } from "bun:test";
import { getModelCandidates, isFreeModelId, modelProfiles } from "./model-config";

describe("modelProfiles", () => {
  it("uses only OpenRouter free model ids", () => {
    for (const profileId of Object.keys(modelProfiles)) {
      const candidates = getModelCandidates(
        profileId as keyof typeof modelProfiles,
      );

      for (const modelId of candidates) {
        expect(isFreeModelId(modelId)).toBe(true);
      }
    }
  });
});
