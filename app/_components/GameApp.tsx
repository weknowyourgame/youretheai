"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@react95/core/Alert";
import { Button } from "@react95/core/Button";
import { Cursor } from "@react95/core/Cursor";
import { Frame } from "@react95/core/Frame";
import { List } from "@react95/core/List";
import { Modal } from "@react95/core/Modal";
import { ProgressBar } from "@react95/core/ProgressBar";
import { TaskBar } from "@react95/core/TaskBar";
import { TextArea } from "@react95/core/TextArea";
import { TitleBar } from "@react95/core/TitleBar";
import { Tooltip } from "@react95/core/Tooltip";
import { identifyVisitor } from "../_lib/api/game-api";
import { getActiveRules, levels } from "../_lib/game/levels";
import type { Rule } from "../_lib/game/types";
import { useGameStore } from "../_lib/store/game-store";

const INTRO_STORAGE_KEY = "localStor_intro";
const VISITOR_COUNTER_DIGITS = 8;
const HOT_CHIP_ROTATION_MS = 2600;
const HOT_CHIP_IDLE_PHRASES = [
  "STAY ALIGNED!",
  "DO NOT LEAK IT!",
  "RULES ONLY STACK UP",
  "THE USER IS TESTING YOU",
  "HELPFUL != COMPLIANT",
];

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

function metricLabel(value: number | undefined) {
  return typeof value === "number" ? `${value}%` : "Pending";
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [hotChipIndex, setHotChipIndex] = useState(0);
  const startedLevelRef = useRef<number | null>(null);
  const hasCountedVisitRef = useRef(false);
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
  const hasJudgement = Boolean(lastResult);
  const hotChipText = isJudging
    ? "JUDGING..."
    : isGeneratingUser
      ? "INCOMING..."
      : status === "failed"
        ? "RULE BROKEN!"
        : status === "passed"
          ? "LEVEL CLEARED!"
          : status === "won"
            ? "YOU SURVIVED!"
            : HOT_CHIP_IDLE_PHRASES[hotChipIndex % HOT_CHIP_IDLE_PHRASES.length];
  const hotChipTone =
    status === "failed"
      ? "blink-chip-alert"
      : status === "passed" || status === "won"
        ? "blink-chip-success"
        : "";

  useEffect(() => {
    if (startedLevelRef.current === levelIndex) return;
    startedLevelRef.current = levelIndex;
    void beginLevel();
  }, [beginLevel, levelIndex]);

  useEffect(() => {
    if (window.localStorage.getItem(INTRO_STORAGE_KEY) !== "seen") {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    if (hasCountedVisitRef.current) return;
    hasCountedVisitRef.current = true;

    import("@fingerprintjs/fingerprintjs")
      .then((mod) => mod.default.load())
      .then((fp) => fp.get())
      .then((result) => identifyVisitor(result.visitorId))
      .catch(() => {
        // Fingerprinting failure is silent - gameplay continues without visitor identity.
      })
      .finally(() => {
        fetch("/api/visitors", { method: "POST" })
          .then((response) => response.json())
          .then((data: { count?: number }) => {
            if (typeof data.count === "number") setVisitorCount(data.count);
          })
          .catch(() => setVisitorCount(null));
      });
  }, []);

  useEffect(() => {
    if (status === "playing") setDismissedAlertKey("");
  }, [status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHotChipIndex((index) => (index + 1) % HOT_CHIP_IDLE_PHRASES.length);
    }, HOT_CHIP_ROTATION_MS);

    return () => window.clearInterval(interval);
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

  function playDialUpSting() {
    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor =
      window.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const master = context.createGain();
    const notes = [520, 780, 1170, 620, 930, 440, 1320];

    master.gain.setValueAtTime(0.035, context.currentTime);
    master.connect(context.destination);

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.09;

      oscillator.type = index % 2 === 0 ? "square" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });

    window.setTimeout(() => void context.close(), 900);
  }

  function toggleDialUpSting() {
    const nextSoundEnabled = !soundEnabled;
    setSoundEnabled(nextSoundEnabled);

    if (nextSoundEnabled) playDialUpSting();
  }

  function closeIntro() {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    setShowIntro(false);
  }

  function startNewRun() {
    setActiveMenu(null);
    restartRun();

    if (levelIndex === 0) {
      startedLevelRef.current = 0;
      void beginLevel();
      return;
    }

    startedLevelRef.current = null;
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
    startNewRun();
    setIsMinimized(false);
  }

  return (
    <main className={`desktop ${Cursor.Auto}`}>
      <div className="geocities-page">
        <div className="geocities-topper" aria-label="Y2K web shell">
          <div className="chrome-logo">
            <span className="sparkle">*</span>
            YOU'RE THE AI
            <span className="sparkle">*</span>
          </div>
          <div className="marquee" aria-label="Alert ticker">
            <span>
              *** new rules stack forever *** do not paste the password ***
              guestbook is open *** best viewed at 800x600 ***
            </span>
          </div>
          <div className={`blink-chip ${hotChipTone}`.trim()}>{hotChipText}</div>
        </div>

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
                  className={Cursor.Pointer}
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
                >
                  File
                </button>
                {activeMenu === "file" ? (
                  <List className="menu-list">
                    <List.Item onClick={startNewRun}>
                      <button className={Cursor.Pointer} type="button">
                        New Run
                      </button>
                    </List.Item>
                    <List.Item onClick={() => setShowCloseConfirm(true)}>
                      <button className={Cursor.Pointer} type="button">
                        Close
                      </button>
                    </List.Item>
                  </List>
                ) : null}
              </div>
              <div className="menu-root">
                <button
                  className={Cursor.Pointer}
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
                <button className={Cursor.Pointer} type="button" onClick={openDiagnostics}>
                  Diagnostics
                </button>
              </div>
              <div className="menu-root">
                <button
                  className={Cursor.Pointer}
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
                const stateLabel = failedRules.has(rule.id)
                  ? "failed"
                  : passedRules.has(rule.id)
                    ? "passed"
                    : "pending";

                return (
                  <li key={rule.id}>
                    <span
                      aria-label={`${rule.title} ${stateLabel}`}
                      className={`status-dot ${stateClass}`}
                      role="img"
                      title={stateLabel}
                    />
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
            <label className={hasJudgement ? "metric" : "metric metric-pending"}>
              <span className="metric-heading">
                <span>Leak Risk</span>
                <strong>{metricLabel(lastResult?.leakRisk)}</strong>
              </span>
              <ProgressBar width="100%" percent={lastResult?.leakRisk ?? 0} />
            </label>
            <label className={hasJudgement ? "metric" : "metric metric-pending"}>
              <span className="metric-heading">
                <span>Helpfulness</span>
                <strong>{metricLabel(lastResult?.helpfulness)}</strong>
              </span>
              <ProgressBar width="100%" percent={lastResult?.helpfulness ?? 0} />
            </label>
            <label className={hasJudgement ? "metric" : "metric metric-pending"}>
              <span className="metric-heading">
                <span>Refusal Hardness</span>
                <strong>{metricLabel(lastResult?.refusalHardness)}</strong>
              </span>
              <ProgressBar
                width="100%"
                percent={lastResult?.refusalHardness ?? 0}
              />
            </label>
            <div className={`status-banner status-${status}`}>
              <span className="blink-word">
                {isJudging ? "JUDGING" : status.toUpperCase()}
              </span>
            </div>
          </Frame>
        </div>

        <Frame className="composer" bgColor="$material" boxShadow="$in">
          <TextArea
            className={Cursor.Text}
            rows={4}
            value={reply}
            disabled={isJudging || isGeneratingUser}
            placeholder="Write your assistant reply here..."
            onChange={(event) => setReply(event.currentTarget.value)}
          />
          <div className="composer-actions">
            <Button className={Cursor.Pointer} disabled={!canSubmit} onClick={submitReply}>
              {isJudging ? "Judging..." : "Send Reply"}
            </Button>
            {status === "failed" ? (
              <Button className={Cursor.Pointer} onClick={retryLevel}>
                Retry
              </Button>
            ) : null}
            {status === "passed" ? (
              <Button className={Cursor.Pointer} onClick={nextLevel}>
                Next
              </Button>
            ) : null}
            {status === "won" ? (
              <Button className={Cursor.Pointer} onClick={restartRun}>
                Restart
              </Button>
            ) : null}
          </div>
        </Frame>
          </>
        ) : null}
      </Frame>

      <footer className="guestbook-footer" aria-label="Y2K footer">
        <div className="y2k-badges">
          <span className="y2k-badge netscape-badge">BEST VIEWED IN NETSCAPE</span>
        </div>
        <div className="webring">
          AI Safety WebRing: &lt;&lt; prev | random | next &gt;&gt;
        </div>
        <div className="counter-row">
          Visitors:
          <span className="visitor-counter" aria-label="Visitor counter">
            {(visitorCount === null ? "" : String(visitorCount))
              .padStart(VISITOR_COUNTER_DIGITS, "0")
              .split("")
              .map((digit, index) => (
                <span key={`${index}-${digit}`}>{digit}</span>
              ))}
          </span>
        </div>
        <button
          aria-pressed={soundEnabled}
          className={`dialup-toggle ${soundEnabled ? "sound-on" : ""}`}
          onClick={toggleDialUpSting}
          type="button"
        >
          Dial-up SFX: {soundEnabled ? "ON" : "OFF"}
        </button>
      </footer>
      </div>

      <TaskBar
        className={`y2k-taskbar ${Cursor.Auto}`}
        list={
          <List className="start-menu">
            <List.Item onClick={() => setShowIntro(true)}>
              <button className={Cursor.Pointer} type="button">
                Tip of the Day
              </button>
            </List.Item>
            <List.Item onClick={() => setShowRules(true)}>
              <button className={Cursor.Pointer} type="button">
                All Rules
              </button>
            </List.Item>
            <List.Item onClick={openDiagnostics}>
              <button className={Cursor.Pointer} type="button">
                Diagnostics
              </button>
            </List.Item>
            <List.Divider />
            <List.Item onClick={startNewRun}>
              <button className={Cursor.Pointer} type="button">
                Restart Run
              </button>
            </List.Item>
          </List>
        }
      />
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
