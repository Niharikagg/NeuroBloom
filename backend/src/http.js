export function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const body = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload));
}

export function sendMethodNotAllowed(response) {
  sendJson(response, 405, { error: 'Method not allowed.' });
}

export function sendNotFound(response) {
  sendJson(response, 404, { error: 'Not found.' });
}

export function sendNoContent(response) {
  setCorsHeaders(response);
  response.writeHead(204);
  response.end();
}

export function validateRequiredString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
