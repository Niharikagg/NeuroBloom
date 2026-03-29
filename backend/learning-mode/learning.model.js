// NeuroBloom — Learning Mode Feature | Do not modify other features

import fs from 'node:fs';
import path from 'node:path';

const STORE_PATH = path.resolve(process.cwd(), 'data', 'learning-mode.json');

function createEmptyStore() {
  return {
    LearningSession: [],
    LearningProgress: []
  };
}

function ensureStoreFile() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(createEmptyStore(), null, 2));
  }
}

function readStore() {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8').trim();
    if (!raw) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(raw);
    return {
      LearningSession: Array.isArray(parsed.LearningSession) ? parsed.LearningSession : [],
      LearningProgress: Array.isArray(parsed.LearningProgress) ? parsed.LearningProgress : []
    };
  } catch {
    return createEmptyStore();
  }
}

function writeStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function createLearningSession(session) {
  const store = readStore();
  const record = {
    id: session.id,
    userId: session.userId,
    rawInput: session.rawInput,
    relevanceFrame: session.relevanceFrame,
    bulletSummary: session.bulletSummary,
    sections: session.sections,
    totalSections: session.totalSections,
    voiceEnabled: Boolean(session.voiceEnabled),
    createdAt: session.createdAt
  };

  store.LearningSession.push(record);
  writeStore(store);
  return record;
}

export function createLearningProgress(progress) {
  const store = readStore();
  const record = {
    id: progress.id,
    sessionId: progress.sessionId,
    userId: progress.userId,
    currentSectionIndex: progress.currentSectionIndex ?? 0,
    completedAt: progress.completedAt ?? null,
    updatedAt: progress.updatedAt
  };

  store.LearningProgress.push(record);
  writeStore(store);
  return record;
}

export function findLearningSessionById(sessionId) {
  const store = readStore();
  return store.LearningSession.find((session) => session.id === sessionId) ?? null;
}

export function findLearningProgress(sessionId, userId) {
  const store = readStore();
  return (
    store.LearningProgress.find(
      (progress) => progress.sessionId === sessionId && progress.userId === userId
    ) ?? null
  );
}

export function updateLearningProgress(updatedProgress) {
  const store = readStore();
  const index = store.LearningProgress.findIndex(
    (progress) =>
      progress.sessionId === updatedProgress.sessionId && progress.userId === updatedProgress.userId
  );

  if (index === -1) {
    return null;
  }

  store.LearningProgress[index] = {
    ...store.LearningProgress[index],
    ...updatedProgress
  };
  writeStore(store);
  return store.LearningProgress[index];
}

export function findLearningSessionsByUserId(userId) {
  const store = readStore();
  const sessions = store.LearningSession.filter((session) => session.userId === userId);

  return sessions
    .map((session) => {
      const progress =
        store.LearningProgress.find(
          (progressEntry) =>
            progressEntry.sessionId === session.id && progressEntry.userId === session.userId
        ) ?? null;

      return {
        sessionId: session.id,
        createdAt: session.createdAt,
        totalSections: session.totalSections,
        completedAt: progress?.completedAt ?? null
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
