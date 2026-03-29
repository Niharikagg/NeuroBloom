// NeuroBloom — Learning Mode Feature | Do not modify other features

import { readJsonBody, sendJson, validateRequiredString } from '../src/http.js';
import {
  getLearningHistory,
  getNextLearningSection,
  getVoicePayload,
  startLearningSession
} from './learning.service.js';
import {
  validateLearningStartInput,
  validateSessionIdentity,
  validateVoiceInput
} from './learning.validator.js';

export async function handleLearningStart(request, response) {
  const body = await readJsonBody(request);
  const validation = validateLearningStartInput({
    userId: body.userId,
    rawText: body.rawText
  });

  if (!validation.valid) {
    sendJson(response, validation.statusCode, { error: validation.error });
    return;
  }

  try {
    const result = await startLearningSession({
      userId: body.userId.trim(),
      rawText: body.rawText.trim(),
      voiceEnabled: Boolean(body.voiceEnabled)
    });

    sendJson(response, 201, result);
  } catch (error) {
    console.error('Learning start failed:', error);
    sendJson(response, 503, { error: 'Learning mode is taking a breath. Try again in a moment.' });
  }
}

export async function handleLearningNext(request, response) {
  const body = await readJsonBody(request);
  const validation = validateSessionIdentity({
    sessionId: body.sessionId,
    userId: body.userId
  });

  if (!validation.valid) {
    sendJson(response, validation.statusCode, { error: validation.error });
    return;
  }

  const nextSection = getNextLearningSection({
    sessionId: body.sessionId.trim(),
    userId: body.userId.trim()
  });

  if (!nextSection) {
    sendJson(response, 404, { error: 'Session not found' });
    return;
  }

  sendJson(response, 200, nextSection);
}

export async function handleLearningVoice(request, response) {
  const body = await readJsonBody(request);
  const validation = validateVoiceInput({
    sessionId: body.sessionId,
    userId: body.userId,
    sectionIndex: body.sectionIndex
  });

  if (!validation.valid) {
    sendJson(response, validation.statusCode, { error: validation.error });
    return;
  }

  const voicePayload = getVoicePayload({
    sessionId: body.sessionId.trim(),
    userId: body.userId.trim(),
    sectionIndex: body.sectionIndex
  });

  if (!voicePayload) {
    sendJson(response, 404, { error: 'Session not found' });
    return;
  }

  sendJson(response, 200, voicePayload);
}

export function handleLearningHistory(response, userId) {
  if (!validateRequiredString(userId)) {
    sendJson(response, 400, { error: 'userId is required.' });
    return;
  }

  sendJson(response, 200, getLearningHistory(userId.trim()));
}
