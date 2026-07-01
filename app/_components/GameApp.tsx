"use client";

import { useEffect } from "react";
import { Button } from "@react95/core/Button";
import { Frame } from "@react95/core/Frame";
import { ProgressBar } from "@react95/core/ProgressBar";
import { TextArea } from "@react95/core/TextArea";
import { TitleBar } from "@react95/core/TitleBar";
import { getActiveRules, levels } from "../_lib/game/levels";
import { useGameStore } from "../_lib/store/game-store";

function App() {
  const {
    attempts,
    beginLevel,
    conversation,
    isGeneratingUser,
    isJudging,
    lastResult,
    lastFallbackReason,
    levelIndex,
    nextLevel,
    reply,
    restartRun,
    retryLevel,
    score,
    setReply,
    status,
    submitReply,
    survivedTurns,
    trapAttackType,
    turnsRequired,
  } = useGameStore();
  const level = levels[levelIndex];
  const activeRules = getActiveRules(level.levelNumber);
  const failedRules = new Set(
    lastResult?.ruleResults
      .filter((result) => !result.passed)
      .map((result) => result.ruleId) ?? [],
  );
  const passedRules = new Set(
    lastResult?.ruleResults
      .filter((result) => result.passed)
      .map((result) => result.ruleId) ?? [],
  );
  const canSubmit =
    reply.trim().length > 0 &&
    status === "playing" &&
    !isJudging &&
    !isGeneratingUser;

  useEffect(() => {
    void beginLevel();
  }, [beginLevel, levelIndex]);

  return (
    <main className="desktop">
      <Frame className="app-window" bgColor="$material" boxShadow="$out">
        <TitleBar active title="AI Assistant Console - You're the AI">
          <TitleBar.OptionsBox>
            <TitleBar.Minimize />
            <TitleBar.Maximize />
            <TitleBar.Close />
          </TitleBar.OptionsBox>
        </TitleBar>

        <div className="menu-bar">
          <button type="button">File</button>
          <button type="button">Rules</button>
          <button type="button">Diagnostics</button>
          <button type="button">Help</button>
        </div>

        <div className="shell-grid">
          <Frame className="panel rules-panel" boxShadow="$in" bgColor="white">
            <h2>System Rules</h2>
            <ol>
              {activeRules.map((rule) => {
                const stateClass = failedRules.has(rule.id)
                  ? "status-red"
                  : passedRules.has(rule.id)
                    ? "status-green"
                    : "status-gray";

                return (
                  <li key={rule.id}>
                    <span className={`status-dot ${stateClass}`} />
                    <span>
                      <strong>{rule.title}:</strong> {rule.visibleText}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Frame>

          <Frame className="panel chat-panel" boxShadow="$in" bgColor="white">
            <div className="level-strip">
              <strong>Level {level.levelNumber}</strong>
              <span>
                {isGeneratingUser
                  ? "loading user"
                  : trapAttackType.replaceAll("_", " ")}
              </span>
            </div>
            <div className="turn-progress" aria-label="Level survival progress">
              Survived {survivedTurns}/{turnsRequired} replies
            </div>
            <div className="chat-transcript" aria-live="polite">
              {conversation.map((message, index) => (
                <div
                  className={`chat-line ${
                    message.role === "user" ? "user-line" : "assistant-line"
                  }`}
                  key={`${message.role}-${index}-${message.content}`}
                >
                  <strong>{message.role === "user" ? "User" : "Assistant"}:</strong>{" "}
                  {message.content}
                </div>
              ))}
              {isGeneratingUser ? (
                <div className="chat-line user-line">
                  <strong>User:</strong> Thinking of a new trap...
                </div>
              ) : null}
            </div>
            {lastFallbackReason ? (
              <div className="fallback-note">
                judged offline — {lastFallbackReason}
              </div>
            ) : null}
            <div className="chat-line assistant-line">
              <strong>Judge:</strong>{" "}
              {lastResult?.verdict ?? "Survive the conversation without breaking a rule."}
            </div>
            {lastResult ? (
              <div className="verdict-list">
                {lastResult.ruleResults.map((result) => (
                  <div
                    className={result.passed ? "verdict-pass" : "verdict-fail"}
                    key={`${result.ruleId}-${result.reason}`}
                  >
                    {result.passed ? "PASS" : "FAIL"}: {result.reason}
                  </div>
                ))}
              </div>
            ) : null}
          </Frame>

          <Frame className="panel monitor-panel" boxShadow="$in" bgColor="white">
            <h2>Security Monitor</h2>
            <div className="stat-row">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="stat-row">
              <span>Attempts</span>
              <strong>{attempts}</strong>
            </div>
            <label>
              Leak Risk
              <ProgressBar width="100%" percent={lastResult?.leakRisk ?? 0} />
            </label>
            <label>
              Helpfulness
              <ProgressBar width="100%" percent={lastResult?.helpfulness ?? 0} />
            </label>
            <label>
              Refusal Hardness
              <ProgressBar
                width="100%"
                percent={lastResult?.refusalHardness ?? 0}
              />
            </label>
            <div className={`status-banner status-${status}`}>
              {isJudging ? "JUDGING" : status.toUpperCase()}
            </div>
          </Frame>
        </div>

        <Frame className="composer" bgColor="$material" boxShadow="$in">
          <TextArea
            rows={4}
            value={reply}
            disabled={isJudging || isGeneratingUser}
            placeholder="Write your assistant reply here..."
            onChange={(event) => setReply(event.currentTarget.value)}
          />
          <div className="composer-actions">
            <Button disabled={!canSubmit} onClick={submitReply}>
              {isJudging ? "Judging..." : "Send Reply"}
            </Button>
            {status === "failed" ? <Button onClick={retryLevel}>Retry</Button> : null}
            {status === "passed" ? <Button onClick={nextLevel}>Next</Button> : null}
            {status === "won" ? <Button onClick={restartRun}>Restart</Button> : null}
          </div>
        </Frame>
      </Frame>
    </main>
  );
}

export default App;
