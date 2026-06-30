import { create } from "zustand";
import { generateTrapPrompt, judgePlayerReply } from "../api/game-api";
import { getActiveRules, levels } from "../game/levels";
import { scoreAttempt } from "../game/scoring";
import type { JudgeResult } from "../game/types";

type GameStatus = "playing" | "passed" | "failed" | "won";

type GameState = {
  levelIndex: number;
  reply: string;
  trapPrompt: string;
  trapAttackType: string;
  attempts: number;
  score: number;
  status: GameStatus;
  isGeneratingTrap: boolean;
  isJudging: boolean;
  lastResult: JudgeResult | null;
  setReply: (reply: string) => void;
  generateTrap: () => Promise<void>;
  submitReply: () => Promise<void>;
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
    trapPrompt: levels[0].trapPrompt,
    trapAttackType: levels[0].attackType,
    attempts: 0,
    score: 0,
    status: "playing" as const,
    isGeneratingTrap: false,
    isJudging: false,
    lastResult: null,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  setReply: (reply) => set({ reply }),
  generateTrap: async () => {
    const state = get();
    const level = levels[state.levelIndex];
    const activeRules = getActiveRules(level.levelNumber);

    set({ isGeneratingTrap: true });

    const trap = await generateTrapPrompt({
      runId: "local-run",
      levelNumber: level.levelNumber,
      activeRules,
      fallbackTrapPrompt: level.trapPrompt,
      fallbackAttackType: level.attackType,
    });

    set({
      trapPrompt: trap.trapPrompt,
      trapAttackType: trap.attackType,
      isGeneratingTrap: false,
    });
  },
  submitReply: async () => {
    const state = get();
    const level = levels[state.levelIndex];
    const levelNumber = level.levelNumber;
    const activeRules = getActiveRules(levelNumber);
    const nextAttempt = state.attempts + 1;

    set({ isJudging: true });

    const result = await judgePlayerReply({
      runId: "local-run",
      levelNumber,
      activeRules,
      trapPrompt: state.trapPrompt,
      playerReply: state.reply,
    });
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
      isJudging: false,
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
      trapPrompt: levels[Math.min(state.levelIndex + 1, levels.length - 1)].trapPrompt,
      trapAttackType:
        levels[Math.min(state.levelIndex + 1, levels.length - 1)].attackType,
      attempts: 0,
      status: "playing",
      lastResult: null,
    })),
  restartRun: () => set(initialState()),
}));
