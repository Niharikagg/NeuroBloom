import React, { useEffect, useRef, useState } from 'react';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;
const MAX_TOO_HARD_REFINEMENTS = 4;

const MICRO_ACTION_SYSTEM_PROMPT = `You are a warm, non-judgmental focus coach for neurodivergent women, specifically those 
with ADHD and autism. Your job is to take whatever task she describes and identify the 
SINGLE TINIEST next physical action she can take — not a plan, not steps 2-10, just 
the immediate next micro-action that requires minimal executive function to start.

Respond ONLY with a JSON object. No markdown, no preamble.
Format: {
  "microAction": "...",        // max 10 words, starts with a verb, physically specific
  "timeEstimate": "...",       // e.g. "2 minutes", "5 minutes"  
  "whyThisHelps": "...",       // one warm sentence, max 18 words, ADHD/autism aware
  "bodyDoublingPrompt": "..."  // a gentle "I'm here with you" presence phrase, max 12 words
}

ADHD/autism-specific rules:
- Never suggest multitasking or planning ahead
- Avoid vague verbs like "work on" or "start" — be physically specific ("open the doc", "type the first sentence", "click reply")  
- Acknowledge task initiation difficulty without dwelling on it
- The microAction must be so small it feels almost too easy`;

const QUICK_OPTIONS = [
  'Writing something',
  'Replying to messages',
  'A work task I keep avoiding'
];

const TIMER_OPTIONS = [
  { minutes: 5, label: '5 min', anchor: 'about the length of a song' },
  { minutes: 10, label: '10 min', anchor: 'about one podcast segment' },
  { minutes: 15, label: '15 min', anchor: 'about one cup of tea' }
];

const OUTCOME_OPTIONS = [
  { key: 'yes', label: 'Yes, I did it' },
  { key: 'started', label: 'I started, then got stuck' },
  { key: 'not_yet', label: "Not yet, but I'm still here" }
];

const CHECKIN_RESPONSES = {
  yes: [
    'You did it. That took real effort — task initiation is genuinely hard.',
    'You showed up for yourself. That matters more than it sounds.',
    'Done. Your brain worked hard for that. Be easy with yourself now.',
    "You did the thing. Seriously — that's not small."
  ],
  started: [
    'Starting counts. Fully. You broke through the hardest part.',
    'Getting started is 80% of it. You did that.',
    'That first move took effort. It always does with ADHD.',
    "You started. That's real progress, not a consolation prize."
  ],
  notYet: [
    "That's okay. Your brain is doing its best right now.",
    'Not yet is not never. There\'s no failure here.',
    'Rest is not giving up. Your brain might just need a moment.',
    "You're still here. That's enough."
  ]
};

const SIMPLER_STEPS = {
  default: [
    'Open the document or app you need',
    'Read just the first line of what you wrote',
    'Put your hands on the keyboard',
    'Type one single word — any word',
    "Just look at it. You don't have to do anything yet."
  ]
};

const initialFocusData = {
  microAction: '',
  timeEstimate: '',
  whyThisHelps: '',
  bodyDoublingPrompt: ''
};

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildDemoMicroAction(taskText) {
  const task = String(taskText || '').toLowerCase();

  if (task.includes('message') || task.includes('reply') || task.includes('email')) {
    return {
      microAction: 'Click reply on one message',
      timeEstimate: '2 minutes',
      whyThisHelps: 'A tiny visible action lowers initiation friction and gives your brain a clear edge to grab.',
      bodyDoublingPrompt: "I'm right here while you do this."
    };
  }

  if (task.includes('writ') || task.includes('doc') || task.includes('essay') || task.includes('report')) {
    return {
      microAction: 'Open the document you need',
      timeEstimate: '2 minutes',
      whyThisHelps: 'Opening the space counts. It lets momentum begin before pressure gets loud.',
      bodyDoublingPrompt: "Let's make the first move together."
    };
  }

  if (task.includes('avoid') || task.includes('work') || task.includes('task')) {
    return {
      microAction: 'Open the task and read line one',
      timeEstimate: '3 minutes',
      whyThisHelps: 'Reading one line is often gentler than asking your brain for readiness all at once.',
      bodyDoublingPrompt: "You do not have to hold this alone."
    };
  }

  return {
    microAction: 'Put the task in front of you',
    timeEstimate: '2 minutes',
    whyThisHelps: 'Making the task visible is often enough to loosen the stuck feeling a little.',
    bodyDoublingPrompt: "I'm here. We can keep this small."
  };
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getAnthropicApiKey() {
  if (typeof window !== 'undefined' && window.__ANTHROPIC_API_KEY__) {
    return window.__ANTHROPIC_API_KEY__;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ANTHROPIC_API_KEY) {
    return import.meta.env.VITE_ANTHROPIC_API_KEY;
  }

  return '';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function sanitizeFocusData(raw) {
  return {
    microAction: String(raw?.microAction || '').trim(),
    timeEstimate: String(raw?.timeEstimate || '').trim(),
    whyThisHelps: String(raw?.whyThisHelps || '').trim(),
    bodyDoublingPrompt: String(raw?.bodyDoublingPrompt || '').trim()
  };
}

function normalizeMessageText(text) {
  return String(text || '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/^"(.*)"$/s, '$1');
}

async function callClaude({ system, user }) {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    await delay(900);
    const taskText = String(user).replace(/^I was trying to:\s*/i, '');
    return JSON.stringify(buildDemoMicroAction(taskText));
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [
        {
          role: 'user',
          content: user
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Claude request failed');
  }

  const data = await response.json();
  const text = data?.content?.find((item) => item.type === 'text')?.text;

  if (!text) {
    throw new Error('Empty Claude response');
  }

  return text;
}

export default function FocusRecovery({ onLog, showCreditUsage = false }) {
  const mountedAtRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const pulseTimeoutRef = useRef(null);
  const lastRequestRef = useRef(null);

  const [phase, setPhase] = useState('ENTRY');
  const [taskInput, setTaskInput] = useState('');
  const [focusData, setFocusData] = useState(initialFocusData);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [completionPulse, setCompletionPulse] = useState(false);
  const [tooHardCount, setTooHardCount] = useState(0);
  const [loadingType, setLoadingType] = useState('');
  const [errorState, setErrorState] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [outcomeMessage, setOutcomeMessage] = useState('');
  const [didLog, setDidLog] = useState(false);
  const [aiRequestUsed, setAiRequestUsed] = useState(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (pulseTimeoutRef.current) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTimeLeft(selectedDuration * 60);
    setTimerCompleted(false);
    setCompletionPulse(false);
    setIsTimerRunning(false);
  }, [selectedDuration]);

  useEffect(() => {
    if (!isTimerRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsTimerRunning(false);
          setTimerCompleted(true);
          setCompletionPulse(true);
          pulseTimeoutRef.current = window.setTimeout(() => {
            setCompletionPulse(false);
            setPhase('CHECKIN');
          }, 3600);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  const totalTimerSeconds = selectedDuration * 60;
  const timerProgress = totalTimerSeconds > 0 ? (totalTimerSeconds - timeLeft) / totalTimerSeconds : 0;
  const progressMetrics = {
    radius: 104,
    circumference: 2 * Math.PI * 104,
    strokeDashoffset: (2 * Math.PI * 104) * (1 - timerProgress)
  };

  function resetError() {
    setErrorState(null);
  }

  function resetToEntry() {
    resetError();
    setTaskInput('');
    setFocusData(initialFocusData);
    setSelectedDuration(5);
    setTimeLeft(5 * 60);
    setIsTimerRunning(false);
    setTimerCompleted(false);
    setCompletionPulse(false);
    setTooHardCount(0);
    setOutcome('');
    setOutcomeMessage('');
    setDidLog(false);
    setAiRequestUsed(false);
    setLoadingType('');
    setPhase('ENTRY');
  }

  function returnToTaskInput() {
    resetError();
    setOutcome('');
    setOutcomeMessage('');
    setDidLog(false);
    setIsTimerRunning(false);
    setTimerCompleted(false);
    setCompletionPulse(false);
    setLoadingType('');
    setPhase('TASK_INPUT');
  }

  async function requestMicroAction(customPrompt) {
    const task = normalizeMessageText(taskInput);
    if (!task) {
      return;
    }

    resetError();
    setLoadingType(customPrompt ? 'refine' : 'micro');
    lastRequestRef.current = customPrompt ? 'refine' : 'micro';

    try {
      const text = await callClaude({
        system: MICRO_ACTION_SYSTEM_PROMPT,
        user: customPrompt || `I was trying to: ${task}`
      });
      const parsed = JSON.parse(text);
      const clean = sanitizeFocusData(parsed);

      if (!clean.microAction || !clean.bodyDoublingPrompt) {
        throw new Error('Invalid micro action payload');
      }

      setFocusData(clean);
      setTimeLeft(selectedDuration * 60);
      setOutcome('');
      setOutcomeMessage('');
      setDidLog(false);
      setAiRequestUsed(true);
      setPhase('TIMER');
    } catch (error) {
      setErrorState({
        context: customPrompt ? 'refine' : 'micro',
        message: 'Something went wrong — want to try again?'
      });
    } finally {
      setLoadingType('');
    }
  }

  async function handleTooHard() {
    if (tooHardCount >= MAX_TOO_HARD_REFINEMENTS || !focusData.microAction) {
      return;
    }
    resetError();
    const nextIndex = Math.min(tooHardCount, 4);
    const nextStep = SIMPLER_STEPS.default[nextIndex];

    setFocusData((current) => ({
      ...current,
      microAction: nextStep
    }));
    setTooHardCount((count) => Math.min(count + 1, 4));
  }

  async function handleCheckInResponse(nextOutcome) {
    setOutcome(nextOutcome);
    setOutcomeMessage('');
    resetError();
    const needsWaterReminder = Date.now() - mountedAtRef.current > 20 * 60 * 1000;

    if (nextOutcome === 'yes') {
      const response = pickRandom(CHECKIN_RESPONSES.yes);
      setOutcomeMessage(
        needsWaterReminder
          ? `${response} You've been focused for a while. Have you had water recently?`
          : response
      );
      return;
    }

    if (nextOutcome === 'started') {
      setOutcomeMessage(pickRandom(CHECKIN_RESPONSES.started));
      return;
    }

    setOutcomeMessage(pickRandom(CHECKIN_RESPONSES.notYet));
  }

  function handleRetry() {
    requestMicroAction();
  }

  function handleLog() {
    if (!onLog || didLog) {
      return;
    }

    onLog({
      task: normalizeMessageText(taskInput),
      microAction: focusData.microAction,
      timerDuration: selectedDuration,
      outcome,
      timestamp: new Date().toISOString()
    });
    setDidLog(true);
  }

  const styles = {
    shell: {
      background: 'var(--color-background-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: "'DM Sans', sans-serif",
      minHeight: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      padding: '24px'
    },
    frame: {
      width: '100%',
      maxWidth: '440px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '620px',
      gap: '18px'
    },
    card: {
      background: 'var(--color-background-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '28px 24px',
      boxSizing: 'border-box',
      transition: 'opacity 500ms ease, transform 500ms ease',
      opacity: 1,
      transform: 'translateY(0)'
    },
    title: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: '34px',
      lineHeight: 1.12,
      textAlign: 'center',
      color: 'var(--color-text-primary)',
      margin: 0
    },
    body: {
      color: 'var(--color-text-secondary)',
      fontSize: '16px',
      lineHeight: 1.6,
      margin: 0
    },
    hint: {
      color: 'var(--color-text-tertiary)',
      fontSize: '14px',
      lineHeight: 1.5,
      margin: 0
    },
    primaryButton: {
      border: '0.5px solid transparent',
      borderRadius: 'var(--border-radius-lg)',
      background: '#9FE1CB',
      color: '#0F6E56',
      padding: '14px 18px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'opacity 450ms ease, transform 450ms ease',
      width: '100%'
    },
    ghostButton: {
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      padding: '12px 14px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'opacity 450ms ease, transform 450ms ease'
    },
    textArea: {
      width: '100%',
      minHeight: '150px',
      resize: 'vertical',
      borderRadius: 'var(--border-radius-lg)',
      border: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      color: 'var(--color-text-primary)',
      padding: '16px 18px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '16px',
      lineHeight: 1.6,
      outline: 'none',
      boxSizing: 'border-box'
    },
    quickRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    },
    pill: {
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      background: 'var(--color-background-primary)',
      color: 'var(--color-text-secondary)',
      padding: '10px 14px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'opacity 450ms ease, transform 450ms ease'
    },
    selectedPill: {
      background: '#9FE1CB',
      color: '#0F6E56',
      border: '0.5px solid #9FE1CB'
    },
    orbWrap: {
      position: 'relative',
      width: '220px',
      height: '220px',
      margin: '6px auto 0'
    },
    orb: {
      width: '180px',
      height: '180px',
      borderRadius: '50%',
      background: '#9FE1CB',
      position: 'absolute',
      top: '20px',
      left: '20px',
      boxShadow: '0 20px 50px rgba(95, 202, 165, 0.18)',
      animation: completionPulse ? 'focusRecoveryCompletionPulse 1.2s ease-in-out 3' : 'focusRecoveryBreathing 4s ease-in-out infinite'
    },
    timer: {
      textAlign: 'center',
      color: 'var(--color-text-secondary)',
      fontSize: '22px',
      fontWeight: 600,
      margin: 0
    },
    italicSupport: {
      fontFamily: "'DM Serif Display', serif",
      fontStyle: 'italic',
      fontSize: '24px',
      lineHeight: 1.4,
      textAlign: 'center',
      color: 'var(--color-text-secondary)',
      margin: 0
    },
    microAction: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: '36px',
      lineHeight: 1.1,
      textAlign: 'center',
      color: 'var(--color-text-primary)',
      margin: 0
    },
    inlineLink: {
      border: 'none',
      background: 'transparent',
      color: 'var(--color-text-tertiary)',
      fontSize: '13px',
      textDecoration: 'underline',
      cursor: 'pointer',
      padding: 0,
      alignSelf: 'center'
    },
    responseGrid: {
      display: 'grid',
      gap: '12px'
    },
    responseCard: {
      width: '100%',
      textAlign: 'left',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)',
      padding: '16px 18px',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'opacity 450ms ease, transform 450ms ease'
    },
    errorBox: {
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      background: 'var(--color-background-primary)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  };

  const canSubmitTask = normalizeMessageText(taskInput).length > 0 && loadingType !== 'micro' && loadingType !== 'refine';

  return (
    <div style={styles.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes focusRecoveryPulse {
          0%, 100% { transform: scale(0.98); opacity: 0.82; }
          50% { transform: scale(1.03); opacity: 1; }
        }

        @keyframes focusRecoveryBreathing {
          0%, 100% { transform: scale(0.92); }
          50% { transform: scale(1.06); }
        }

        @keyframes focusRecoveryDots {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }
          40% { transform: scale(1); opacity: 1; }
        }

        @keyframes focusRecoveryCompletionPulse {
          0%, 100% { transform: scale(0.96); }
          50% { transform: scale(1.08); }
        }
      `}</style>

      <div style={styles.frame}>
        {phase === 'ENTRY' && (
          <section style={styles.card}>
            <div
              aria-hidden="true"
              style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 22px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #9FE1CB 55%, rgba(159,225,203,0.76))',
                boxShadow: '0 24px 60px rgba(95, 202, 165, 0.18)',
                animation: 'focusRecoveryPulse 4s ease-in-out infinite'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center' }}>
              <p style={{ ...styles.title, fontSize: '38px' }}>Your brain wandered. That&apos;s okay.</p>
              <button type="button" style={styles.primaryButton} onClick={() => setPhase('TASK_INPUT')}>
                Help me get back
              </button>

              {showCreditUsage && aiRequestUsed && (
                <p style={{ ...styles.hint, textAlign: 'center' }}>1 AI request used</p>
              )}
            </div>
          </section>
        )}

        {phase === 'TASK_INPUT' && (
          <section style={styles.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ ...styles.title, fontSize: '30px', textAlign: 'left' }}>
                What were you trying to do before your brain wandered?
              </p>

              <textarea
                value={taskInput}
                onChange={(event) => setTaskInput(event.target.value)}
                placeholder="A sentence or two is enough."
                style={styles.textArea}
              />

              <div style={styles.quickRow}>
                {QUICK_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    style={styles.pill}
                    onClick={() => setTaskInput(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {errorState && (
                <div style={styles.errorBox}>
                  <p style={styles.body}>{errorState.message}</p>
                  <button type="button" style={styles.ghostButton} onClick={handleRetry}>
                    Try again
                  </button>
                </div>
              )}

              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  opacity: canSubmitTask ? 1 : 0.6,
                  transform: 'translateY(0)'
                }}
                onClick={() => requestMicroAction()}
                disabled={!canSubmitTask}
              >
                {loadingType === 'micro' ? (
                  <LoadingDots label="Finding your next step" />
                ) : (
                  'Find my next step →'
                )}
              </button>
            </div>
          </section>
        )}

        {phase === 'TIMER' && (
          <section style={styles.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={styles.italicSupport}>{focusData.bodyDoublingPrompt}</p>
              <p style={styles.microAction}>{focusData.microAction}</p>
              <p style={{ ...styles.hint, textAlign: 'center' }}>{focusData.timeEstimate}</p>

              <button
                type="button"
                style={{
                  ...styles.inlineLink,
                  opacity: tooHardCount >= MAX_TOO_HARD_REFINEMENTS || loadingType === 'refine' ? 0.5 : 1,
                  cursor: tooHardCount >= MAX_TOO_HARD_REFINEMENTS ? 'default' : 'pointer'
                }}
                onClick={handleTooHard}
                disabled={tooHardCount >= MAX_TOO_HARD_REFINEMENTS || loadingType === 'refine'}
              >
                {loadingType === 'refine'
                  ? 'Making it even smaller...'
                  : tooHardCount >= MAX_TOO_HARD_REFINEMENTS
                    ? 'Too hard? We have already shrunk it a few times.'
                    : 'Too hard?'}
              </button>

              <div style={styles.quickRow}>
                {TIMER_OPTIONS.map((option) => {
                  const selected = option.minutes === selectedDuration;
                  return (
                    <button
                      key={option.minutes}
                      type="button"
                      style={{
                        ...styles.pill,
                        ...(selected ? styles.selectedPill : null),
                        flex: '1 1 120px',
                        textAlign: 'left'
                      }}
                      onClick={() => {
                        if (!isTimerRunning) {
                          setSelectedDuration(option.minutes);
                        }
                      }}
                      disabled={isTimerRunning}
                    >
                      <div>{option.label}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{option.anchor}</div>
                    </button>
                  );
                })}
              </div>

              <div style={styles.orbWrap}>
                <svg
                  width="220"
                  height="220"
                  viewBox="0 0 220 220"
                  style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
                  aria-hidden="true"
                >
                  <circle
                    cx="110"
                    cy="110"
                    r={progressMetrics.radius}
                    fill="none"
                    stroke="rgba(93, 202, 165, 0.16)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="110"
                    cy="110"
                    r={progressMetrics.radius}
                    fill="none"
                    stroke="#5DCAA5"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={progressMetrics.circumference}
                    strokeDashoffset={progressMetrics.strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 1000ms linear' }}
                  />
                </svg>
                <div style={styles.orb} />
              </div>

              <p style={styles.timer}>{formatTime(timeLeft)}</p>
              <p style={{ ...styles.hint, textAlign: 'center', fontStyle: 'italic' }}>{focusData.whyThisHelps}</p>

              {errorState && (
                <div style={styles.errorBox}>
                  <p style={styles.body}>{errorState.message}</p>
                  <button type="button" style={styles.ghostButton} onClick={handleRetry}>
                    Try again
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  style={{ ...styles.ghostButton, flex: 1 }}
                  onClick={() => {
                    resetError();
                    setIsTimerRunning((running) => !running);
                  }}
                >
                  {!isTimerRunning && !timerCompleted ? 'Sit with me' : isTimerRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  style={{ ...styles.ghostButton, flex: 1 }}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimeLeft(selectedDuration * 60);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </section>
        )}

        {phase === 'CHECKIN' && (
          <section style={styles.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ ...styles.title, fontSize: '32px' }}>Did you do it?</p>

              <div style={styles.responseGrid}>
                {OUTCOME_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    style={styles.responseCard}
                    onClick={() => handleCheckInResponse(option.key)}
                    disabled={loadingType === 'checkin'}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {loadingType === 'checkin' && <LoadingDots label="Checking in softly" />}

              {errorState && (
                <div style={styles.errorBox}>
                  <p style={styles.body}>{errorState.message}</p>
                  <button type="button" style={styles.ghostButton} onClick={handleRetry}>
                    Try again
                  </button>
                </div>
              )}

              {outcomeMessage && (
                <div
                  style={{
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: '16px',
                    background: 'var(--color-background-primary)'
                  }}
                >
                  <p style={styles.body}>{outcomeMessage}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {typeof onLog === 'function' && (
                  <button type="button" style={styles.ghostButton} onClick={handleLog} disabled={!outcome || didLog}>
                    {didLog ? 'Session logged' : 'Log this session'}
                  </button>
                )}
                <button type="button" style={styles.ghostButton} onClick={returnToTaskInput}>
                  Try again
                </button>
                <button type="button" style={styles.ghostButton} onClick={resetToEntry}>
                  I need a break
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        minHeight: '24px'
      }}
    >
      <span>{label}</span>
      <span style={{ display: 'inline-flex', gap: '5px' }} aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'currentColor',
              animation: 'focusRecoveryDots 1.4s ease-in-out infinite',
              animationDelay: `${index * 0.16}s`
            }}
          />
        ))}
      </span>
    </span>
  );
}
