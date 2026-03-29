import {
  handleGenerateInsight,
  handleGetInsightHistory,
  handleGetInsightReport
} from './insight.controller.js';

// Routes under /api/insight only:
// POST /api/insight/generate
// GET /api/insight/report/:reportId
// GET /api/insight/history/:userId
export async function handleInsightRoutes(request, response, pathname) {
  if (request.method === 'POST' && pathname === '/api/insight/generate') {
    await handleGenerateInsight(request, response);
    return true;
  }

  if (request.method === 'GET' && pathname.startsWith('/api/insight/report/')) {
    const reportId = pathname.replace('/api/insight/report/', '').trim();
    handleGetInsightReport(response, reportId);
    return true;
  }

  if (request.method === 'GET' && pathname.startsWith('/api/insight/history/')) {
    const userId = pathname.replace('/api/insight/history/', '').trim();
    handleGetInsightHistory(response, userId);
    return true;
  }

  return false;
}
