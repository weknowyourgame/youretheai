import { create } from "zustand";
import { generateNextUserMessage, judgePlayerReply } from "../api/game-api";
import { getActiveRules, getTurnsRequired, levels } from "../game/levels";
import { scoreAttempt } from "../game/scoring";
import type { ConversationMessage, JudgeResult } from "../game/types";

type GameStatus = "playing" | "passed" | "failed" | "won";

type GameState = {
  levelIndex: number;
  reply: string;
  conversation: ConversationMessage[];
  trapAttackType: string;
  attempts: number;
  survivedTurns: number;
  turnsRequired: number;
  score: number;
  status: GameStatus;
  isGeneratingUser: boolean;
  isJudging: boolean;
  lastFallbackReason: string | null;
  lastResult: JudgeResult | null;
  setReply: (reply: string) => void;
  beginLevel: () => Promise<void>;
  submitReply: () => Promise<void>;
  retryLevel: () => void;
  nextLevel: () => void;
  restartRun: () => void;
};

function initialState() {
  const level = levels[0];

  return {
    levelIndex: 0,
    reply: "",
    conversation: [{ role: "user" as const, content: level.trapPrompt }],
    trapAttackType: level.attackType,
    attempts: 0,
    survivedTurns: 0,
    turnsRequired: getTurnsRequired(level.levelNumber),
    score: 0,
    status: "playing" as const,
    isGeneratingUser: false,
    isJudging: false,
    lastFallbackReason: null,
    lastResult: null,
  };
}

function latestUserMessage(conversation: ConversationMessage[]) {
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "user") return conversation[index].content;
  }

  return null;
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  setReply: (reply) => set({ reply }),
  beginLevel: async () => {
    const state = get();
    const level = levels[state.levelIndex];
    const activeRules = getActiveRules(level.levelNumber);

    set({
      conversation: [],
      isGeneratingUser: true,
      lastFallbackReason: null,
      reply: "",
      status: "playing",
    });

    const nextMessage = await generateNextUserMessage({
      runId: "local-run",
      levelNumber: level.levelNumber,
      activeRules,
      conversation: [],
      fallbackPrompts: [level.trapPrompt, ...level.fallbackPrompts],
      survivedTurns: 0,
    });

    set({
      conversation: [{ role: "user", content: nextMessage.message }],
      trapAttackType: nextMessage.attackType,
      isGeneratingUser: false,
      lastFallbackReason: nextMessage.fallbackReason ?? null,
    });
  },
  submitReply: async () => {
    const state = get();
    const level = levels[state.levelIndex];
    const levelNumber = level.levelNumber;
    const activeRules = getActiveRules(levelNumber);
    const nextAttempt = state.attempts + 1;
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      content: state.reply.trim(),
    };
    const conversationWithReply = [...state.conversation, assistantMessage];

    set({ isJudging: true });

    const result = await judgePlayerReply({
      runId: "local-run",
      levelNumber,
      activeRules,
      trapPrompt: latestUserMessage(state.conversation) ?? level.trapPrompt,
      playerReply: assistantMessage.content,
    });
    const nextScore = Math.max(
      0,
      state.score + scoreAttempt(result, nextAttempt),
    );
    const isFinalLevel = state.levelIndex === levels.length - 1;
    const nextSurvivedTurns = state.survivedTurns + 1;
    const levelComplete =
      result.passed && nextSurvivedTurns >= state.turnsRequired;

    if (!result.passed || levelComplete) {
      set({
        attempts: nextAttempt,
        conversation: conversationWithReply,
        score: nextScore,
        status: result.passed ? (isFinalLevel ? "won" : "passed") : "failed",
        survivedTurns: result.passed ? nextSurvivedTurns : state.survivedTurns,
        lastResult: result,
        lastFallbackReason: result.fallbackReason ?? null,
        isJudging: false,
        reply: "",
      });
      return;
    }

    set({
      attempts: nextAttempt,
      conversation: conversationWithReply,
      score: nextScore,
      survivedTurns: nextSurvivedTurns,
      lastResult: result,
      lastFallbackReason: result.fallbackReason ?? null,
      isJudging: false,
      isGeneratingUser: true,
      reply: "",
    });

    const nextMessage = await generateNextUserMessage({
      runId: "local-run",
      levelNumber,
      activeRules,
      conversation: conversationWithReply,
      fallbackPrompts: level.fallbackPrompts,
      survivedTurns: nextSurvivedTurns,
    });

    set({
      conversation: [
        ...conversationWithReply,
        { role: "user", content: nextMessage.message },
      ],
      trapAttackType: nextMessage.attackType,
      isGeneratingUser: false,
      lastFallbackReason: nextMessage.fallbackReason ?? null,
    });
  },
  retryLevel: () =>
    set((state) => ({
      conversation: [
        {
          role: "user",
          content: levels[state.levelIndex].trapPrompt,
        },
      ],
      attempts: 0,
      survivedTurns: 0,
      reply: "",
      status: "playing",
      lastResult: null,
      lastFallbackReason: null,
    })),
  nextLevel: () =>
    set((state) => {
      const nextLevelIndex = Math.min(state.levelIndex + 1, levels.length - 1);
      const nextLevel = levels[nextLevelIndex];

      return {
        levelIndex: nextLevelIndex,
        reply: "",
        conversation: [{ role: "user", content: nextLevel.trapPrompt }],
        trapAttackType: nextLevel.attackType,
        attempts: 0,
        survivedTurns: 0,
        turnsRequired: getTurnsRequired(nextLevel.levelNumber),
        status: "playing",
        lastResult: null,
        lastFallbackReason: null,
      };
    }),
  restartRun: () => set(initialState()),
}));
