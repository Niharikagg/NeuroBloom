import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INSIGHT_STORE_PATH = path.resolve(process.cwd(), 'data', 'insight-reports.json');

function getInsightStorePath() {
  return DEFAULT_INSIGHT_STORE_PATH;
}

function createEmptyInsightStore() {
  return {
    InsightReport: []
  };
}

function readInsightStore() {
  const storePath = getInsightStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });

  if (!fs.existsSync(storePath)) {
    const emptyStore = createEmptyInsightStore();
    fs.writeFileSync(storePath, JSON.stringify(emptyStore, null, 2));
    return emptyStore;
  }

  try {
    const rawStore = fs.readFileSync(storePath, 'utf8').trim();
    if (!rawStore) {
      return createEmptyInsightStore();
    }

    const parsedStore = JSON.parse(rawStore);
    return {
      InsightReport: Array.isArray(parsedStore.InsightReport) ? parsedStore.InsightReport : []
    };
  } catch {
    return createEmptyInsightStore();
  }
}

function writeInsightStore(store) {
  const storePath = getInsightStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function createInsightReport(report) {
  const store = readInsightStore();
  const insightReport = {
    id: report.id,
    userId: report.userId,
    screeningResponsesSnapshot: report.screeningResponsesSnapshot,
    reportText: report.reportText,
    generatedAt: report.generatedAt,
    tone: 'warm'
  };

  store.InsightReport.push(insightReport);
  writeInsightStore(store);

  return insightReport;
}

export function findInsightReportById(reportId) {
  const store = readInsightStore();
  return store.InsightReport.find((report) => report.id === reportId) ?? null;
}

export function findInsightReportsByUserId(userId) {
  const store = readInsightStore();
  return store.InsightReport
    .filter((report) => report.userId === userId)
    .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime());
}
