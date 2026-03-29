// NeuroBloom — Learning Mode Feature | Do not modify other features

import {
  handleLearningHistory,
  handleLearningNext,
  handleLearningStart,
  handleLearningVoice
} from './learning.controller.js';

export async function handleLearningRoutes(request, response, pathname) {
  if (request.method === 'POST' && pathname === '/api/learning/start') {
    await handleLearningStart(request, response);
    return true;
  }

  if (request.method === 'POST' && pathname === '/api/learning/next') {
    await handleLearningNext(request, response);
    return true;
  }

  if (request.method === 'POST' && pathname === '/api/learning/voice') {
    await handleLearningVoice(request, response);
    return true;
  }

  if (request.method === 'GET' && pathname.startsWith('/api/learning/history/')) {
    const userId = pathname.replace('/api/learning/history/', '').trim();
    handleLearningHistory(response, userId);
    return true;
  }

  return false;
}
