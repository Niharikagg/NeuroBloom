import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const testDbPath = path.resolve(process.cwd(), 'test-data', 'focus-recovery.smoke.sqlite');
process.env.NODE_ENV = 'test';
process.env.FOCUS_RECOVERY_DB_PATH = testDbPath;
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

fs.rmSync(testDbPath, { force: true });
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

const { server } = await import('../src/server.js');
const { closeDatabase } = await import('../src/db.js');

const originalFetch = globalThis.fetch;
let baseUrl = '';

function logPass(name) {
  console.log(`PASS ${name}`);
}

async function startServer() {
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
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
}

async function testFocusRecoveryLifecycle() {
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
  assert.deepEqual(await logResponse.json(), { acknowledged: true });

  logPass('focus recovery lifecycle');
}

async function testFocusRecoveryBreakdown() {
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
    body: JSON.stringify({ userId: 'user-456' })
  });

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
  assert.equal(breakdownPayload.nextAction, 'Open the draft document.');
  assert.equal(breakdownPayload.timerDuration, 300);

  globalThis.fetch = originalFetch;
  logPass('focus recovery breakdown');
}

async function testCommunicationCoachMessageHelper() {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://api.anthropic.com/v1/messages') {
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, 'claude-sonnet-4-20250514');
      assert.match(requestBody.system, /communication coach/i);

      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: '{"verdict":"needs_shortening","note":"You already know what you mean; it just got padded on the way out.","rewrite":"Can we move this to next week?"}'
            }
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return originalFetch(input, init);
  };

  const response = await fetch(`${baseUrl}/api/communication-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'message_helper',
      userText: 'Hi, sorry to bother you, I was just wondering if maybe we could move this to next week if that is okay.',
      context: 'I need to reschedule with a colleague.'
    })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, 'message_helper');
  assert.deepEqual(JSON.parse(payload.result), {
    verdict: 'needs_shortening',
    note: 'You already know what you mean; it just got padded on the way out.',
    rewrite: 'Can we move this to next week?'
  });

  globalThis.fetch = originalFetch;
  logPass('communication coach message helper');
}

async function testCommunicationCoachPrepMode() {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://api.anthropic.com/v1/messages') {
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, 'claude-sonnet-4-20250514');
      assert.match(requestBody.system, /grounding support system/i);

      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: '{"what_to_expect":"It may feel awkward at first, and that does not mean you are doing it wrong. Most likely, you will say a few important things, the other person will respond imperfectly, and then the conversation will end.","rescue_phrase":"Give me a second to think.","permission":"You are allowed to step out or end it the minute it becomes too much."}'
            }
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return originalFetch(input, init);
  };

  const response = await fetch(`${baseUrl}/api/communication-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'prep_mode',
      userText: 'I have a hard meeting tomorrow with my manager.',
      context: 'I need to ask for clearer expectations.'
    })
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, 'prep_mode');
  assert.deepEqual(JSON.parse(payload.result), {
    what_to_expect:
      'It may feel awkward at first, and that does not mean you are doing it wrong. Most likely, you will say a few important things, the other person will respond imperfectly, and then the conversation will end.',
    rescue_phrase: 'Give me a second to think.',
    permission: 'You are allowed to step out or end it the minute it becomes too much.'
  });

  globalThis.fetch = originalFetch;
  logPass('communication coach prep mode');
}

try {
  await startServer();
  await testFocusRecoveryLifecycle();
  await testFocusRecoveryBreakdown();
  await testCommunicationCoachMessageHelper();
  await testCommunicationCoachPrepMode();
} finally {
  globalThis.fetch = originalFetch;
  await stopServer();
}
