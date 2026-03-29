import crypto from 'node:crypto';
import {
  createFocusSession,
  createFocusTimer,
  getFocusSession,
  getFocusTimer,
  logFocusOutcome,
  markFocusTimerCompleted,
  saveFocusBreakdown
} from '../db.js';
import { readJsonBody, sendJson, validateRequiredString } from '../http.js';
import { generateSingleNextAction } from '../ai/focusRecovery.js';

const BREAKDOWN_TIMER_DURATION_SECONDS = 300;
const COMPLETION_OPTIONS = ['Yes', 'Not yet', 'I got distracted'];
const VALID_OUTCOMES = new Set(['yes', 'no', 'distracted']);

function nowIsoString() {
  return new Date().toISOString();
}

function createEndsAt(startTimeIso, timerDurationSeconds) {
  const startTime = new Date(startTimeIso);
  return new Date(startTime.getTime() + timerDurationSeconds * 1000).toISOString();
}

export async function handleFocusRecoveryRoute(request, response, pathname) {
  if (pathname === '/api/focus-recovery/start') {
    return handleStartSession(request, response);
  }

  if (pathname === '/api/focus-recovery/breakdown') {
    return handleBreakdown(request, response);
  }

  if (pathname === '/api/focus-recovery/timer/start') {
    return handleStartTimer(request, response);
  }

  if (pathname === '/api/focus-recovery/timer/complete') {
    return handleCompleteTimer(request, response);
  }

  if (pathname === '/api/focus-recovery/log') {
    return handleLogOutcome(request, response);
  }

  return false;
}

// POST /api/focus-recovery/start
// Starts a new focus recovery session and returns the single reset question.
async function handleStartSession(request, response) {
  const body = await readJsonBody(request);

  if (!validateRequiredString(body.userId)) {
    sendJson(response, 400, { error: 'userId is required.' });
    return true;
  }

  const sessionId = crypto.randomUUID();
  createFocusSession({
    id: sessionId,
    userId: body.userId.trim(),
    createdAt: nowIsoString()
  });

  sendJson(response, 201, {
    sessionId,
    question: 'What were you trying to do before your brain wandered?'
  });
  return true;
}

// POST /api/focus-recovery/breakdown
// Uses the AI model to reduce the user's description to one tiny next action only.
async function handleBreakdown(request, response) {
  const body = await readJsonBody(request);

  if (!validateRequiredString(body.sessionId) || !validateRequiredString(body.userInput)) {
    sendJson(response, 400, { error: 'sessionId and userInput are required.' });
    return true;
  }

  const session = getFocusSession(body.sessionId.trim());
  if (!session) {
    sendJson(response, 404, { error: 'Focus session not found.' });
    return true;
  }

  try {
    const nextAction = await generateSingleNextAction(body.userInput.trim());
    saveFocusBreakdown({
      sessionId: session.id,
      userInput: body.userInput.trim(),
      nextAction
    });

    sendJson(response, 200, {
      sessionId: session.id,
      nextAction,
      timerDuration: BREAKDOWN_TIMER_DURATION_SECONDS
    });
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Unable to generate next action.'
    });
  }

  return true;
}

// POST /api/focus-recovery/timer/start
// Creates and stores an active body-doubling timer for the session.
async function handleStartTimer(request, response) {
  const body = await readJsonBody(request);

  if (!validateRequiredString(body.sessionId) || !Number.isInteger(body.timerDuration) || body.timerDuration <= 0) {
    sendJson(response, 400, { error: 'sessionId and a positive integer timerDuration are required.' });
    return true;
  }

  const session = getFocusSession(body.sessionId.trim());
  if (!session) {
    sendJson(response, 404, { error: 'Focus session not found.' });
    return true;
  }

  const startTime = nowIsoString();
  const timerId = crypto.randomUUID();
  const endsAt = createEndsAt(startTime, body.timerDuration);

  createFocusTimer({
    id: timerId,
    sessionId: session.id,
    startTime,
    endsAt,
    status: 'active',
    ambientSound: body.ambientSound ?? null,
    durationSeconds: body.timerDuration
  });

  sendJson(response, 201, {
    timerId,
    startTime,
    endsAt
  });
  return true;
}

// POST /api/focus-recovery/timer/complete
// Marks the timer complete and returns the neutral follow-up options.
async function handleCompleteTimer(request, response) {
  const body = await readJsonBody(request);

  if (!validateRequiredString(body.timerId) || !validateRequiredString(body.sessionId)) {
    sendJson(response, 400, { error: 'timerId and sessionId are required.' });
    return true;
  }

  const timer = getFocusTimer(body.timerId.trim());
  if (!timer || timer.sessionId !== body.sessionId.trim()) {
    sendJson(response, 404, { error: 'Focus timer not found.' });
    return true;
  }

  markFocusTimerCompleted({
    timerId: timer.id,
    sessionId: timer.sessionId
  });

  sendJson(response, 200, {
    message: 'Did you do it?',
    options: COMPLETION_OPTIONS
  });
  return true;
}

// POST /api/focus-recovery/log
// Stores the user's timer outcome without scoring, streaks, or judgment logic.
async function handleLogOutcome(request, response) {
  const body = await readJsonBody(request);

  if (
    !validateRequiredString(body.sessionId) ||
    !validateRequiredString(body.timerId) ||
    !validateRequiredString(body.outcome)
  ) {
    sendJson(response, 400, { error: 'sessionId, timerId, and outcome are required.' });
    return true;
  }

  const session = getFocusSession(body.sessionId.trim());
  const timer = getFocusTimer(body.timerId.trim());
  const outcome = body.outcome.trim().toLowerCase();

  if (!session) {
    sendJson(response, 404, { error: 'Focus session not found.' });
    return true;
  }

  if (!timer || timer.sessionId !== session.id) {
    sendJson(response, 404, { error: 'Focus timer not found.' });
    return true;
  }

  if (!VALID_OUTCOMES.has(outcome)) {
    sendJson(response, 400, { error: 'outcome must be one of yes, no, or distracted.' });
    return true;
  }

  logFocusOutcome({
    id: crypto.randomUUID(),
    sessionId: session.id,
    timerId: timer.id,
    outcome,
    loggedAt: nowIsoString()
  });

  sendJson(response, 201, { acknowledged: true });
  return true;
}
