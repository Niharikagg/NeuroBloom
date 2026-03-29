import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DB_PATH = './data/focus-recovery.json';

function resolveDatabasePath() {
  const configuredPath = process.env.FOCUS_RECOVERY_DB_PATH ?? DEFAULT_DB_PATH;

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

const databasePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

function createEmptyStore() {
  return {
    FocusSession: [],
    FocusTimer: [],
    FocusOutcome: []
  };
}

function loadStore() {
  if (!fs.existsSync(databasePath)) {
    const emptyStore = createEmptyStore();
    fs.writeFileSync(databasePath, JSON.stringify(emptyStore, null, 2));
    return emptyStore;
  }

  try {
    const raw = fs.readFileSync(databasePath, 'utf8').trim();
    if (!raw) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(raw);
    return {
      FocusSession: Array.isArray(parsed.FocusSession) ? parsed.FocusSession : [],
      FocusTimer: Array.isArray(parsed.FocusTimer) ? parsed.FocusTimer : [],
      FocusOutcome: Array.isArray(parsed.FocusOutcome) ? parsed.FocusOutcome : []
    };
  } catch {
    return createEmptyStore();
  }
}

let store = loadStore();

function persistStore() {
  fs.writeFileSync(databasePath, JSON.stringify(store, null, 2));
}

export function createFocusSession({ id, userId, createdAt }) {
  store.FocusSession.push({
    id,
    userId,
    userInput: null,
    nextAction: null,
    createdAt
  });
  persistStore();
}

export function getFocusSession(sessionId) {
  return store.FocusSession.find((session) => session.id === sessionId) ?? null;
}

export function saveFocusBreakdown({ sessionId, userInput, nextAction }) {
  const session = store.FocusSession.find((entry) => entry.id === sessionId);
  if (!session) {
    return;
  }

  session.userInput = userInput;
  session.nextAction = nextAction;
  persistStore();
}

export function createFocusTimer({
  id,
  sessionId,
  startTime,
  endsAt,
  status,
  ambientSound,
  durationSeconds
}) {
  store.FocusTimer.push({
    id,
    sessionId,
    startTime,
    endsAt,
    status,
    ambientSound,
    durationSeconds
  });
  persistStore();
}

export function getFocusTimer(timerId) {
  return store.FocusTimer.find((timer) => timer.id === timerId) ?? null;
}

export function markFocusTimerCompleted({ timerId, sessionId }) {
  const timer = store.FocusTimer.find(
    (entry) => entry.id === timerId && entry.sessionId === sessionId
  );

  if (!timer) {
    return 0;
  }

  timer.status = 'completed';
  persistStore();
  return 1;
}

export function logFocusOutcome({ id, sessionId, timerId, outcome, loggedAt }) {
  store.FocusOutcome.push({
    id,
    sessionId,
    timerId,
    outcome,
    loggedAt
  });
  persistStore();
}

export function closeDatabase() {
  persistStore();
}
