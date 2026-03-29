import './env.js';
import http from 'node:http';
import { URL } from 'node:url';
import { sendJson, sendMethodNotAllowed, sendNoContent, sendNotFound } from './http.js';
import { handleCommunicationCoachRoute } from './routes/communicationCoach.js';
import { handleFocusRecoveryRoute } from './routes/focusRecovery.js';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const isApiRoute =
      requestUrl.pathname === '/api/communication-coach' ||
      requestUrl.pathname.startsWith('/api/focus-recovery/');

    if (request.method === 'OPTIONS' && isApiRoute) {
      sendNoContent(response);
      return;
    }

    if (request.method !== 'POST') {
      if (isApiRoute) {
        sendMethodNotAllowed(response);
        return;
      }

      sendNotFound(response);
      return;
    }

    const communicationCoachHandled = await handleCommunicationCoachRoute(
      request,
      response,
      requestUrl.pathname
    );
    if (communicationCoachHandled) {
      return;
    }

    const handled = await handleFocusRecoveryRoute(request, response, requestUrl.pathname);
    if (!handled) {
      sendNotFound(response);
    }
  } catch (error) {
    const statusCode =
      error instanceof Error && 'statusCode' in error && Number.isInteger(error.statusCode)
        ? error.statusCode
        : 500;

    sendJson(response, statusCode, {
      error: error instanceof Error ? error.message : 'Internal server error.'
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Focus Recovery backend listening on port ${port}`);
  });
}

export { server };
