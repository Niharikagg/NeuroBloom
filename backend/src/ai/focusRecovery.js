const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

function normalizeAction(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateSingleNextAction(userInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const instructions = [
    'You turn a messy task description into exactly one next smallest action.',
    'Return one short action only.',
    'Never return a list, numbering, multiple actions, explanation, encouragement, or alternatives.'
  ].join(' ');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: instructions
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `User task: ${userInput}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const outputText = normalizeAction(payload.output_text ?? '');

  if (!outputText) {
    throw new Error('AI response did not include a next action.');
  }

  return outputText;
}
