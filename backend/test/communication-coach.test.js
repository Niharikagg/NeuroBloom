import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-key';

const { server } = await import('../src/server.js');
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
});

test('communication coach returns structured message-helper output', async () => {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://api.anthropic.com/v1/messages') {
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, 'claude-sonnet-4-20250514');
      assert.match(requestBody.system, /non-judgmental communication coach/i);

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
});

test('communication coach returns structured prep-mode output', async () => {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://api.anthropic.com/v1/messages') {
      const requestBody = JSON.parse(init.body);
      assert.equal(requestBody.model, 'claude-sonnet-4-20250514');
      assert.match(requestBody.system, /calm, grounding support system/i);

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
});
