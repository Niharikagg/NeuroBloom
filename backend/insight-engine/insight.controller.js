import { getInsightHistory, getInsightReport, generateInsightReport } from './insight.service.js';
import { readJsonBody, sendJson, validateRequiredString } from '../src/http.js';

function isValidScreeningResponses(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        validateRequiredString(item.question) &&
        validateRequiredString(item.answer)
    )
  );
}

export async function handleGenerateInsight(request, response) {
  const body = await readJsonBody(request);

  if (!validateRequiredString(body.userId) || !isValidScreeningResponses(body.screeningResponses)) {
    sendJson(response, 400, {
      error: 'userId and screeningResponses are required.'
    });
    return;
  }

  try {
    const result = await generateInsightReport({
      userId: body.userId.trim(),
      screeningResponses: body.screeningResponses.map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim()
      }))
    });

    sendJson(response, 201, result);
  } catch (error) {
    console.error('Insight controller error:', error);
    sendJson(response, 503, { error: 'Insight generation unavailable, please try again' });
  }
}

export function handleGetInsightReport(response, reportId) {
  const report = getInsightReport(reportId);

  if (!report) {
    sendJson(response, 404, { error: 'Report not found' });
    return;
  }

  sendJson(response, 200, {
    reportId: report.id,
    reportText: report.reportText,
    generatedAt: report.generatedAt
  });
}

export function handleGetInsightHistory(response, userId) {
  const reports = getInsightHistory(userId);

  sendJson(
    response,
    200,
    reports.map((report) => ({
      reportId: report.id,
      generatedAt: report.generatedAt
    }))
  );
}
