import crypto from 'node:crypto';
import { createInsightReport, findInsightReportById, findInsightReportsByUserId } from './insight.model.js';
import { buildInsightUserPrompt, INSIGHT_SYSTEM_PROMPT } from './insight.prompt.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

function normalizeReportText(rawText) {
  return rawText.trim();
}

export async function generateInsightReport({ userId, screeningResponses }) {
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
      max_tokens: 700,
      system: INSIGHT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildInsightUserPrompt(screeningResponses)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Insight generation failed:', errorBody);
    throw new Error('Insight generation unavailable, please try again');
  }

  const payload = await response.json();
  const reportText = normalizeReportText(payload.content?.[0]?.text ?? '');

  if (!reportText) {
    console.error('Insight generation failed: empty report text');
    throw new Error('Insight generation unavailable, please try again');
  }

  const report = createInsightReport({
    id: crypto.randomUUID(),
    userId,
    screeningResponsesSnapshot: screeningResponses,
    reportText,
    generatedAt: new Date().toISOString()
  });

  return {
    reportId: report.id,
    reportText: report.reportText
  };
}

export function getInsightReport(reportId) {
  return findInsightReportById(reportId);
}

export function getInsightHistory(userId) {
  return findInsightReportsByUserId(userId);
}
