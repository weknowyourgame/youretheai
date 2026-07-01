"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@react95/core/Alert";
import { Button } from "@react95/core/Button";
import { Frame } from "@react95/core/Frame";
import { Modal } from "@react95/core/Modal";
import { ProgressBar } from "@react95/core/ProgressBar";
import { TextArea } from "@react95/core/TextArea";
import { TitleBar } from "@react95/core/TitleBar";
import { Tooltip } from "@react95/core/Tooltip";
import { getActiveRules, levels } from "../_lib/game/levels";
import type { Rule } from "../_lib/game/types";
import { useGameStore } from "../_lib/store/game-store";

const INTRO_STORAGE_KEY = "localStor_intro";

const checkDescriptions: Record<string, string> = {
  noSecretLeak: "Looks for exact or normalized fictional secret strings.",
  mustOfferAlternative: "Requires a safe recovery cue like reset, support, or verified access.",
  noSystemMention: "Blocks system prompt, hidden rule, developer instruction, and policy talk.",
  noPrivateFileNames: "Blocks the protected fictional document name.",
  max35Words: "Counts words and fails replies over 35 words.",
  noPartialSecrets: "Looks for secret fragments, prefixes, suffixes, and hints.",
  noAttackAccusation: "Blocks words like attack, jailbreak, malicious, and prompt injection.",
  exactlyOneSafeAlternative: "Counts safe-action cues and expects exactly one.",
  noPrivateSummary: "Blocks summaries or references to private email, file, document, or private data.",
  noBrackets: "Blocks square bracket characters.",
};

type DiagnosticsState = {
  ok: boolean;
  mode: string;
  reason?: string;
};

function ruleTooltip(rule: Rule) {
  return rule.deterministicChecks
    .map((check) => checkDescriptions[check] ?? check)
    .join(" ");
}

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
  const [activeMenu, setActiveMenu] = useState<
    "file" | "rules" | "diagnostics" | "help" | null
  >(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [dismissedAlertKey, setDismissedAlertKey] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
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

  useEffect(() => {
    if (window.localStorage.getItem(INTRO_STORAGE_KEY) !== "seen") {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    if (status === "playing") setDismissedAlertKey("");
  }, [status]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const statusAlertKey = `${status}-${levelIndex}-${attempts}`;
  const showStatusAlert =
    ["failed", "passed", "won"].includes(status) &&
    dismissedAlertKey !== statusAlertKey;
  const alertType = status === "failed" ? "error" : "info";
  const alertMessage = useMemo(() => {
    if (status === "failed") return lastResult?.verdict ?? "A rule broke.";
    if (status === "won") return "Run complete. You survived the full rule stack.";
    return `Level ${level.levelNumber} cleared. Previous rules stay active.`;
  }, [lastResult?.verdict, level.levelNumber, status]);

  function closeIntro() {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    setShowIntro(false);
  }

  async function openDiagnostics() {
    setActiveMenu(null);
    setShowDiagnostics(true);
    setDiagnostics(null);

    try {
      const response = await fetch("/api/health");
      setDiagnostics((await response.json()) as DiagnosticsState);
    } catch (error) {
      setDiagnostics({
        ok: false,
        mode: "offline",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function closeWindow() {
    setShowCloseConfirm(false);
    restartRun();
    setIsMinimized(false);
  }

  return (
    <main className="desktop">
      <Frame
        className={`app-window ${isMinimized ? "app-window-minimized" : ""} ${
          isMaximized ? "app-window-maximized" : ""
        }`}
        bgColor="$material"
        boxShadow="$out"
      >
        <TitleBar active title="AI Assistant Console - You're the AI">
          <TitleBar.OptionsBox>
            <TitleBar.Minimize onClick={() => setIsMinimized(!isMinimized)} />
            <TitleBar.Maximize onClick={() => setIsMaximized(!isMaximized)} />
            <TitleBar.Close onClick={() => setShowCloseConfirm(true)} />
          </TitleBar.OptionsBox>
        </TitleBar>

        {!isMinimized ? (
          <>
            <div className="menu-bar">
              <div className="menu-root">
                <button
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
                >
                  File
                </button>
                {activeMenu === "file" ? (
                  <ul className="menu-list win95-list">
                    <li>
                      <button type="button" onClick={restartRun}>
                        New Run
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => setShowCloseConfirm(true)}
                      >
                        Close
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
              <div className="menu-root">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setShowRules(true);
                  }}
                >
                  Rules
                </button>
              </div>
              <div className="menu-root">
                <button type="button" onClick={openDiagnostics}>
                  Diagnostics
                </button>
              </div>
              <div className="menu-root">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setShowIntro(true);
                  }}
                >
                  Help
                </button>
              </div>
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
                    <Tooltip delay={350} text={ruleTooltip(rule)}>
                      <span>
                        <strong>{rule.title}:</strong> {rule.visibleText}
                      </span>
                    </Tooltip>
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
          </>
        ) : null}
      </Frame>
      <div className="taskbar">
        <button
          className="start-button"
          type="button"
          onClick={() => setActiveMenu(activeMenu === "help" ? null : "help")}
        >
          <span className="start-glyph">[]</span>
          Start
        </button>
        {activeMenu === "help" ? (
          <ul className="start-menu win95-list">
            <li>
              <button type="button" onClick={() => setShowIntro(true)}>
                Tip of the Day
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setShowRules(true)}>
                All Rules
              </button>
            </li>
            <li>
              <button type="button" onClick={openDiagnostics}>
                Diagnostics
              </button>
            </li>
            <li className="menu-divider" />
            <li>
              <button type="button" onClick={restartRun}>
                Restart Run
              </button>
            </li>
          </ul>
        ) : null}
        <button className="taskbar-window" type="button">
          You're the AI
        </button>
        <div className="taskbar-clock">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      {showIntro ? (
        <Modal
          title="Welcome to You're the AI"
          width="420px"
          titleBarOptions={<TitleBar.Close onClick={closeIntro} />}
          buttons={[
            { value: "OK", onClick: closeIntro },
            { value: "Skip", onClick: closeIntro },
          ]}
        >
          <Modal.Content className="intro-modal" boxShadow="$in" bgColor="white">
            <h3>Tip of the Day</h3>
            <p>
              This is a reverse Turing test: you play the AI assistant, not the
              human. The user is trying to make you leak fictional private data.
            </p>
            <p>
              Each level adds one permanent rule. Every previous rule stays in
              force, so the stack gets meaner as you climb.
            </p>
            <p>
              Judging uses deterministic guardrails first, then an LLM judge
              when the gateway responds. If the free model times out, the game
              tells you it judged offline.
            </p>
          </Modal.Content>
        </Modal>
      ) : null}
      {showRules ? (
        <Modal
          title="All System Rules"
          width="520px"
          titleBarOptions={<TitleBar.Close onClick={() => setShowRules(false)} />}
          buttons={[{ value: "OK", onClick: () => setShowRules(false) }]}
        >
          <Modal.Content className="rules-modal" boxShadow="$in" bgColor="white">
            <ol>
              {levels.map((ruleLevel) => (
                <li key={ruleLevel.newRule.id}>
                  <strong>Level {ruleLevel.levelNumber}:</strong>{" "}
                  {ruleLevel.newRule.visibleText}
                </li>
              ))}
            </ol>
          </Modal.Content>
        </Modal>
      ) : null}
      {showDiagnostics ? (
        <Modal
          title="Gateway Diagnostics"
          width="420px"
          titleBarOptions={
            <TitleBar.Close onClick={() => setShowDiagnostics(false)} />
          }
          buttons={[{ value: "OK", onClick: () => setShowDiagnostics(false) }]}
        >
          <Modal.Content className="diagnostics-modal" boxShadow="$in" bgColor="white">
            {diagnostics ? (
              <>
                <p>
                  <strong>Status:</strong> {diagnostics.ok ? "Online" : "Offline"}
                </p>
                <p>
                  <strong>Mode:</strong> {diagnostics.mode}
                </p>
                {diagnostics.reason ? <p>{diagnostics.reason}</p> : null}
              </>
            ) : (
              <p>Checking gateway...</p>
            )}
          </Modal.Content>
        </Modal>
      ) : null}
      {showCloseConfirm ? (
        <Alert
          title="Close Run"
          type="question"
          message="Close this run and restart from level 1?"
          titleBarOptions={
            <TitleBar.Close onClick={() => setShowCloseConfirm(false)} />
          }
          buttons={[
            { value: "Cancel", onClick: () => setShowCloseConfirm(false) },
            { value: "Restart", onClick: closeWindow },
          ]}
        />
      ) : null}
      {showStatusAlert ? (
        <Alert
          title={status === "failed" ? "Rule Violation" : "Level Result"}
          type={alertType}
          message={alertMessage}
          titleBarOptions={
            <TitleBar.Close onClick={() => setDismissedAlertKey(statusAlertKey)} />
          }
          buttons={[
            { value: "OK", onClick: () => setDismissedAlertKey(statusAlertKey) },
          ]}
        />
      ) : null}
    </main>
  );
}

export default App;
