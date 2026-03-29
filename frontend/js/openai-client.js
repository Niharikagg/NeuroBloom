const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = 'gpt-4o-mini';

function getApiKey() {
  return import.meta.env?.VITE_OPENAI_API_KEY?.trim() || '';
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const textParts = [];
  (response.output || []).forEach((item) => {
    if (item.type !== 'message') return;
    (item.content || []).forEach((contentItem) => {
      if (contentItem.type === 'output_text' && contentItem.text) {
        textParts.push(contentItem.text);
      }
    });
  });

  return textParts.join('\n').trim();
}

async function createStructuredResponse({ system, user, schemaName, schema }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: system }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: user }]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `OpenAI request failed with ${response.status}`);
  }

  const json = await response.json();
  const outputText = extractOutputText(json);
  if (!outputText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return JSON.parse(outputText);
}

export function isOpenAIConfigured() {
  return Boolean(getApiKey());
}

export async function generateTailoredQuestionsWithAI(assessmentSummary) {
  return createStructuredResponse({
    system: 'You create gentle, specific follow-up questions for a women-centered neurodivergence screening experience. Keep the tone calm, validating, and non-harsh. Do not diagnose. Do not mention ADHD or autism directly inside the questions. Generate exactly 3 questions. Each question must be easy to answer with the same five scale options: Strongly Agree, Agree, Neutral / Unsure, Disagree, Strongly Disagree.',
    user: `Use this assessment summary to generate 3 tailored questions:\n${JSON.stringify(assessmentSummary, null, 2)}`,
    schemaName: 'neurobloom_tailored_questions',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        questions: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              key: { type: 'string' },
              theme: { type: 'string', enum: ['masking', 'social', 'sensory'] },
              weight: { type: 'number' },
              prompt: { type: 'string' }
            },
            required: ['key', 'theme', 'weight', 'prompt']
          }
        }
      },
      required: ['questions']
    }
  });
}

export async function generateFinalFeedbackWithAI(analysisSummary) {
  return createStructuredResponse({
    system: 'You write supportive, concise assessment feedback for a women-centered neurodivergence support platform. Use a calm, validating tone. Do not diagnose. Do not use fear-based language. Return one short overview paragraph and exactly 3 specific observations grounded in the user\'s answer patterns.',
    user: `Use this assessment summary to generate the final feedback:\n${JSON.stringify(analysisSummary, null, 2)}`,
    schemaName: 'neurobloom_final_feedback',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        overview: { type: 'string' },
        observations: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: { type: 'string' }
        }
      },
      required: ['overview', 'observations']
    }
  });
}
