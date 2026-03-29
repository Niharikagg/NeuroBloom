// NeuroBloom — Learning Mode Feature | Do not modify other features

import crypto from 'node:crypto';
import {
  createLearningProgress,
  createLearningSession,
  findLearningProgress,
  findLearningSessionById,
  findLearningSessionsByUserId,
  updateLearningProgress
} from './learning.model.js';
import { buildTransformUserPrompt, TRANSFORM_SYSTEM_PROMPT } from './learning.prompt.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

function stripMarkdownJsonFence(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
}

function parseTransformResponse(rawText) {
  const cleaned = stripMarkdownJsonFence(rawText);
  const parsed = JSON.parse(cleaned);

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.relevanceFrame !== 'string' ||
    !Array.isArray(parsed.bulletSummary) ||
    parsed.bulletSummary.length !== 3 ||
    !Array.isArray(parsed.sections)
  ) {
    throw new Error('Invalid learning transform payload');
  }

  const sections = parsed.sections.slice(0, 5).map((section, index) => ({
    sectionIndex:
      Number.isInteger(section.sectionIndex) && section.sectionIndex >= 0 ? section.sectionIndex : index,
    sectionTitle: String(section.sectionTitle ?? '').trim(),
    sectionContent: String(section.sectionContent ?? '').trim(),
    analogy: String(section.analogy ?? '').trim()
  }));

  if (
    sections.length === 0 ||
    sections.some(
      (section) => !section.sectionTitle || !section.sectionContent || !section.analogy
    )
  ) {
    throw new Error('Invalid learning sections');
  }

  return {
    relevanceFrame: parsed.relevanceFrame.trim(),
    bulletSummary: parsed.bulletSummary.map((item) => String(item).trim()).slice(0, 3),
    sections
  };
}

async function requestLearningTransform(rawText) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is not configured.');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1400,
      system: TRANSFORM_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildTransformUserPrompt(rawText)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Learning mode Claude failure:', errorText);
    throw new Error('Learning mode is taking a breath. Try again in a moment.');
  }

  const payload = await response.json();
  return payload.content?.[0]?.text ?? '';
}

async function transformContentWithRetry(rawText) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const rawResponse = await requestLearningTransform(rawText);
      return parseTransformResponse(rawResponse);
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof SyntaxError) &&
        !(error instanceof Error && error.message.startsWith('Invalid learning'))
      ) {
        throw error;
      }
    }
  }

  console.error('Learning mode parsing failed twice:', lastError);
  throw new Error('Learning mode is taking a breath. Try again in a moment.');
}

export async function startLearningSession({ userId, rawText, voiceEnabled }) {
  const transformed = await transformContentWithRetry(rawText);
  const createdAt = new Date().toISOString();
  const sessionId = crypto.randomUUID();

  const session = createLearningSession({
    id: sessionId,
    userId,
    rawInput: rawText,
    relevanceFrame: transformed.relevanceFrame,
    bulletSummary: transformed.bulletSummary,
    sections: transformed.sections,
    totalSections: transformed.sections.length,
    voiceEnabled: Boolean(voiceEnabled),
    createdAt
  });

  createLearningProgress({
    id: crypto.randomUUID(),
    sessionId,
    userId,
    currentSectionIndex: 0,
    completedAt: null,
    updatedAt: createdAt
  });

  return {
    sessionId: session.id,
    relevanceFrame: session.relevanceFrame,
    bulletSummary: session.bulletSummary,
    totalSections: session.totalSections,
    firstSection: session.sections[0]
  };
}

export function getNextLearningSection({ sessionId, userId }) {
  const session = findLearningSessionById(sessionId);
  const progress = findLearningProgress(sessionId, userId);

  if (!session || !progress) {
    return null;
  }

  const nextSectionIndex = progress.currentSectionIndex + 1;

  if (nextSectionIndex >= session.totalSections) {
    updateLearningProgress({
      sessionId,
      userId,
      currentSectionIndex: nextSectionIndex,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      done: true,
      message: "You've got it. That's the whole thing."
    };
  }

  updateLearningProgress({
    sessionId,
    userId,
    currentSectionIndex: nextSectionIndex,
    updatedAt: new Date().toISOString()
  });

  return session.sections[nextSectionIndex];
}

export function getVoicePayload({ sessionId, userId, sectionIndex }) {
  const session = findLearningSessionById(sessionId);
  const progress = findLearningProgress(sessionId, userId);

  if (!session || !progress) {
    return null;
  }

  const section = session.sections.find((section) => section.sectionIndex === sectionIndex);
  if (!section) {
    return null;
  }

  // TTS rendering happens client-side using window.speechSynthesis — backend only prepares the text.
  return {
    sectionIndex: section.sectionIndex,
    voiceText: `${section.sectionTitle}. ${section.sectionContent} Here's an analogy: ${section.analogy}`,
    instruction: 'Pass voiceText to browser SpeechSynthesis API'
  };
}

export function getLearningHistory(userId) {
  return findLearningSessionsByUserId(userId);
}
