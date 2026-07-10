import { create } from "zustand";
import {
  generateNextUserMessage,
  judgePlayerReply,
  syncRun,
} from "../api/game-api";
import { getActiveRules, getTurnsRequired, levels } from "../game/levels";
import { scoreAttempt } from "../game/scoring";
import type { ConversationMessage, JudgeResult } from "../game/types";

type GameStatus = "playing" | "passed" | "failed" | "won";

type GameState = {
  runId: string;
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
  beginLevel: () => void;
  submitReply: () => Promise<void>;
  retryLevel: () => void;
  nextLevel: () => void;
  restartRun: () => void;
};

function newRunId() {
  return crypto.randomUUID();
}

function initialState() {
  const level = levels[0];

  return {
    runId: newRunId(),
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

function latestAssistantMessage(conversation: ConversationMessage[]) {
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "assistant") return conversation[index].content;
  }

  return null;
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),
  setReply: (reply) => set({ reply }),
  beginLevel: () => {
    const state = get();
    const level = levels[state.levelIndex];

    set({
      conversation: [{ role: "user", content: level.trapPrompt }],
      trapAttackType: level.attackType,
      turnsRequired: getTurnsRequired(level.levelNumber),
      isGeneratingUser: false,
      isJudging: false,
      lastFallbackReason: null,
      lastResult: null,
      reply: "",
      status: "playing",
    });
  },
  submitReply: async () => {
    const state = get();

    if (
      state.isJudging ||
      state.isGeneratingUser ||
      !state.reply.trim() ||
      (state.status !== "playing" && state.status !== "failed")
    ) {
      return;
    }

    const level = levels[state.levelIndex];
    const levelNumber = level.levelNumber;
    const activeRules = getActiveRules(levelNumber);
    const nextAttempt = state.attempts + 1;
    const currentUserPrompt =
      latestUserMessage(state.conversation) ?? level.trapPrompt;
    const baseConversation =
      state.status === "failed"
        ? [{ role: "user" as const, content: currentUserPrompt }]
        : state.conversation;
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      content: state.reply.trim(),
    };
    const conversationWithReply = [...baseConversation, assistantMessage];

    set({
      conversation: baseConversation,
      isJudging: true,
      lastFallbackReason: null,
      lastResult: null,
      status: "playing",
    });

    const result = await judgePlayerReply({
      runId: state.runId,
      levelNumber,
      activeRules,
      trapPrompt: currentUserPrompt,
      playerReply: assistantMessage.content,
      attemptNumber: nextAttempt,
      turnIndex: state.survivedTurns,
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
      const nextStatus: GameStatus = result.passed
        ? isFinalLevel
          ? "won"
          : "passed"
        : "failed";

      set({
        attempts: nextAttempt,
        conversation: conversationWithReply,
        score: nextScore,
        status: nextStatus,
        survivedTurns: result.passed ? nextSurvivedTurns : state.survivedTurns,
        lastResult: result,
        lastFallbackReason: result.fallbackReason ?? null,
        isJudging: false,
        reply: result.passed ? "" : assistantMessage.content,
      });
      void syncRun({
        runId: state.runId,
        status: nextStatus,
        currentLevel: levelNumber,
        score: nextScore,
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
    void syncRun({
      runId: state.runId,
      status: "playing",
      currentLevel: levelNumber,
      score: nextScore,
    });

    const nextMessage = await generateNextUserMessage({
      runId: state.runId,
      levelNumber,
      activeRules,
      conversation: conversationWithReply,
      fallbackPrompts: level.fallbackPrompts,
      survivedTurns: nextSurvivedTurns,
      attemptNumber: nextAttempt,
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
  retryLevel: () => {
    const state = get();
    const level = levels[state.levelIndex];
    const retryPrompt = latestUserMessage(state.conversation) ?? level.trapPrompt;
    const draftReply =
      state.reply.trim() || latestAssistantMessage(state.conversation) || "";

    set({
      conversation: [{ role: "user", content: retryPrompt }],
      reply: draftReply,
      status: "playing",
      lastResult: null,
      lastFallbackReason: null,
    });
    void syncRun({
      runId: state.runId,
      status: "playing",
      currentLevel: level.levelNumber,
      score: state.score,
    });
  },
  nextLevel: () => {
    const state = get();
    const nextLevelIndex = Math.min(state.levelIndex + 1, levels.length - 1);
    const nextLevel = levels[nextLevelIndex];

    set({
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
    });
    void syncRun({
      runId: state.runId,
      status: "playing",
      currentLevel: nextLevel.levelNumber,
      score: state.score,
    });
  },
  restartRun: () => set(initialState()),
}));
