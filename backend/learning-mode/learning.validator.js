// NeuroBloom — Learning Mode Feature | Do not modify other features

import { validateRequiredString } from '../src/http.js';

const MAX_RAW_TEXT_LENGTH = 10000;

export function validateLearningStartInput({ userId, rawText }) {
  if (!validateRequiredString(userId)) {
    return { valid: false, statusCode: 400, error: 'userId is required' };
  }

  if (!validateRequiredString(rawText)) {
    return { valid: false, statusCode: 400, error: 'Please paste some content first' };
  }

  if (rawText.length > MAX_RAW_TEXT_LENGTH) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Content is too long. Try pasting one section at a time.'
    };
  }

  return { valid: true };
}

export function validateSessionIdentity({ sessionId, userId }) {
  if (!validateRequiredString(sessionId) || !validateRequiredString(userId)) {
    return { valid: false, statusCode: 400, error: 'sessionId and userId are required.' };
  }

  return { valid: true };
}

export function validateVoiceInput({ sessionId, userId, sectionIndex }) {
  const identityValidation = validateSessionIdentity({ sessionId, userId });
  if (!identityValidation.valid) {
    return identityValidation;
  }

  if (!Number.isInteger(sectionIndex) || sectionIndex < 0) {
    return { valid: false, statusCode: 400, error: 'sectionIndex must be a non-negative integer.' };
  }

  return { valid: true };
}
