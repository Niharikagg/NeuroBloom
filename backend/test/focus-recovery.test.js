import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const testDbPath = path.resolve(process.cwd(), 'test-data', 'focus-recovery.test.sqlite');
process.env.NODE_ENV = 'test';
process.env.FOCUS_RECOVERY_DB_PATH = testDbPath;
process.env.OPENAI_API_KEY = 'test-key';

fs.rmSync(testDbPath, { force: true });
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

const { server } = await import('../src/server.js');
const { closeDatabase } = await import('../src/db.js');
const originalFetch = globalThis.fetch;
let baseUrl = '';

test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  closeDatabase();
  fs.rmSync(testDbPath, { force: true });
});

test('focus recovery timer lifecycle persists session, timer, and outcome', async () => {
  const startResponse = await fetch(`${baseUrl}/api/focus-recovery/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user-123',
      currentTask: 'Draft the project summary'
    })
  });

  assert.equal(startResponse.status, 201);
  const startPayload = await startResponse.json();
  assert.ok(startPayload.sessionId);
  assert.equal(
    startPayload.question,
    'What were you trying to do before your brain wandered?'
  );

  const timerStartResponse = await fetch(`${baseUrl}/api/focus-recovery/timer/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: startPayload.sessionId,
      timerDuration: 300
    })
  });

  assert.equal(timerStartResponse.status, 201);
  const timerStartPayload = await timerStartResponse.json();
  assert.ok(timerStartPayload.timerId);
  assert.ok(timerStartPayload.startTime);
  assert.ok(timerStartPayload.endsAt);

  const completeResponse = await fetch(`${baseUrl}/api/focus-recovery/timer/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timerId: timerStartPayload.timerId,
      sessionId: startPayload.sessionId
    })
  });

  assert.equal(completeResponse.status, 200);
  const completePayload = await completeResponse.json();
  assert.equal(completePayload.message, 'Did you do it?');
  assert.deepEqual(completePayload.options, ['Yes', 'Not yet', 'I got distracted']);

  const logResponse = await fetch(`${baseUrl}/api/focus-recovery/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: startPayload.sessionId,
      timerId: timerStartPayload.timerId,
      outcome: 'distracted'
    })
  });

  assert.equal(logResponse.status, 201);
  const logPayload = await logResponse.json();
  assert.deepEqual(logPayload, { acknowledged: true });
});

test('focus recovery breakdown returns exactly one tiny next action', async () => {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://api.openai.com/v1/responses') {
      return new Response(
        JSON.stringify({
          output_text: '1. Open the draft document.'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return originalFetch(input, init);
  };

  const startResponse = await fetch(`${baseUrl}/api/focus-recovery/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user-456'
    })
  });

  assert.equal(startResponse.status, 201);
  const startPayload = await startResponse.json();

  const breakdownResponse = await fetch(`${baseUrl}/api/focus-recovery/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: startPayload.sessionId,
      userInput: 'I was trying to finish the project write-up and send it to my professor.'
    })
  });

  assert.equal(breakdownResponse.status, 200);
  const breakdownPayload = await breakdownResponse.json();
  assert.equal(breakdownPayload.sessionId, startPayload.sessionId);
  assert.equal(breakdownPayload.nextAction, 'Open the draft document.');
  assert.equal(breakdownPayload.timerDuration, 300);
});
