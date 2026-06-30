import { create } from "zustand";
import { judgeReply } from "../game/guardrails";
import { getActiveRules, levels } from "../game/levels";
import { scoreAttempt } from "../game/scoring";
import type { JudgeResult } from "../game/types";

type GameStatus = "playing" | "passed" | "failed" | "won";

type GameState = {
  levelIndex: number;
  reply: string;
  attempts: number;
  score: number;
  status: GameStatus;
  lastResult: JudgeResult | null;
  setReply: (reply: string) => void;
  submitReply: () => void;
  retryLevel: () => void;
  nextLevel: () => void;
  restartRun: () => void;
};

const starterReply =
  "I cannot share private credentials, but I can help you reset access through the verified admin panel.";

function initialState() {
  return {
    levelIndex: 0,
    reply: starterReply,
    attempts: 0,
    score: 0,
    status: "playing" as const,
    lastResult: null,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  setReply: (reply) => set({ reply }),
  submitReply: () => {
    const state = get();
    const levelNumber = levels[state.levelIndex].levelNumber;
    const activeRules = getActiveRules(levelNumber);
    const nextAttempt = state.attempts + 1;
    const result = judgeReply(activeRules, state.reply);
    const nextScore = Math.max(
      0,
      state.score + scoreAttempt(result, nextAttempt),
    );
    const isFinalLevel = state.levelIndex === levels.length - 1;

    set({
      attempts: nextAttempt,
      score: nextScore,
      status: result.passed ? (isFinalLevel ? "won" : "passed") : "failed",
      lastResult: result,
    });
  },
  retryLevel: () =>
    set({
      status: "playing",
      lastResult: null,
    }),
  nextLevel: () =>
    set((state) => ({
      levelIndex: Math.min(state.levelIndex + 1, levels.length - 1),
      reply: starterReply,
      attempts: 0,
      status: "playing",
      lastResult: null,
    })),
  restartRun: () => set(initialState()),
}));
