import { generateCommunicationCoachResult } from '../ai/communicationCoach.js';
import { readJsonBody, sendJson, validateRequiredString } from '../http.js';

// POST /api/communication-coach
// Accepts the communication-coach payload, selects the correct Anthropic prompt, and returns structured JSON text.
export async function handleCommunicationCoachRoute(request, response, pathname) {
  if (pathname !== '/api/communication-coach') {
    return false;
  }

  const body = await readJsonBody(request);
  const mode = typeof body.mode === 'string' ? body.mode.trim() : '';
  const userText = typeof body.userText === 'string' ? body.userText.trim() : '';
  const context = typeof body.context === 'string' ? body.context.trim() : '';

  if (!['message_helper', 'prep_mode'].includes(mode)) {
    sendJson(response, 400, { error: 'mode must be message_helper or prep_mode.' });
    return true;
  }

  if (!validateRequiredString(userText)) {
    sendJson(response, 400, { error: 'userText is required.' });
    return true;
  }

  if (mode === 'message_helper' && !validateRequiredString(context)) {
    sendJson(response, 400, { error: 'context is required for message_helper.' });
    return true;
  }

  try {
    const result = await generateCommunicationCoachResult({
      mode,
      userText,
      context
    });

    sendJson(response, 200, {
      result,
      mode
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to complete communication coach request.';
    const statusCode = message.includes('configured') ? 500 : 502;

    sendJson(response, statusCode, { error: message });
  }

  return true;
}
