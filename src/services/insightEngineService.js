/**
 * insightEngineService.js
 * Backend service for AI Insight Engine feature.
 *
 * API usage: generateInsightReport() is the ONLY function that calls Claude API.
 * All other functions are local — zero API cost.
 *
 * Safe to import anywhere. Does not modify any other file.
 * Cache stored in ./data/insight_cache.json
 *
 * Usage:
 *   const insight = require('./src/services/insightEngineService');
 *   const cached = await insight.getInsightFromCache("user_123");
 *   if (!cached.data) {
 *     const report = await insight.generateInsightReport(screeningData);
 *   }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = 'https://api.anthropic.com/v1/messages';
const CACHE_DIR = path.resolve(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'insight_cache.json');
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;

const SYSTEM_PROMPT = `You are a warm, knowledgeable insight writer for a women's neurodivergent 
self-awareness app. You are NOT a diagnostician. You never diagnose.

Your job is to read a woman's screening responses and write a short, 
personalized insight report that feels like it was written by a wise, 
compassionate friend who deeply understands ADHD and autism in women.

The tone must be:
- Warm, never clinical
- Validating, never alarming
- Specific to her answers, never generic
- Written in second person ("you", "your")
- Plain conversational language — no jargon

Respond ONLY with a valid JSON object. No markdown. No preamble.

{
  "headline": "...",         // one sentence, the most important thing she should hear, max 18 words
  "opening": "...",          // 2-3 sentences, the "how did it know that" moment — deeply personal, warm
  "patterns": [              // exactly 3 items
    {
      "title": "...",        // 3-5 words naming the pattern
      "insight": "...",      // 2 sentences — what this pattern looks like for her specifically
      "reframe": "..."       // 1 sentence — a compassionate reframe, never toxic positivity
    }
  ],
  "energyCost": "...",       // 1-2 sentences about what her specific combination costs her daily
  "closingMessage": "...",   // 2 sentences — warm, empowering, ends with hope not pressure
  "importantNote": "This is a self-awareness tool, not a clinical assessment. Please speak with a professional for any diagnosis."
}

Rules:
- NEVER use words: disorder, symptoms, diagnosis, condition, deficit, broken, wrong
- ALWAYS reference specific things from her answers — never write something generic
- If masking score is above 60, acknowledge the exhaustion of performing normalcy
- If dominantTraits includes sensory sensitivity, mention the specific cost of sensory load
- closingMessage must NEVER include pressure to improve or fix herself`;

function readCacheFile() {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

// SINGLE API CALL — call this only once per screening session
async function generateInsightReport(screeningData) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { success: false, error: 'MISSING_API_KEY', fallback: true };
    }

    const promptResult = buildPromptFromScreening(screeningData);
    if (!promptResult.success) {
      return { success: false, error: promptResult.error, fallback: true };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: promptResult.data }]
      })
    });

    if (!response.ok) {
      return { success: false, error: 'API_REQUEST_FAILED', fallback: true };
    }

    const data = await response.json();
    const text = Array.isArray(data.content) ? data.content.map((i) => i.text || '').join('') : '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    parsed.generatedAt = new Date().toISOString();
    parsed.userId = screeningData && screeningData.userId ? screeningData.userId : 'anonymous';
    parsed.apiUsed = true;
    parsed.requestId = crypto.randomUUID();

    const saveResult = saveInsightToCache(parsed.userId, parsed);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error, fallback: true };
    }

    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: 'INSIGHT_GENERATION_FAILED', fallback: true };
  }
}

// LOCAL ONLY — no API call
function getInsightFromCache(userId = 'anonymous') {
  try {
    const cache = readCacheFile();
    const entry = cache[userId];

    if (!entry) {
      return { success: true, data: null };
    }

    const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      return { success: true, data: null, expired: true };
    }

    return { success: true, data: entry, fromCache: true };
  } catch (error) {
    return { success: false, error: 'CACHE_READ_FAILED' };
  }
}

// LOCAL ONLY — no API call
function saveInsightToCache(userId = 'anonymous', insightData) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cache = readCacheFile();
    const history = Array.isArray(cache.__history) ? cache.__history : [];

    const entry = {
      ...insightData,
      cachedAt: new Date().toISOString()
    };

    cache[userId] = entry;
    cache.__history = [entry, ...history];

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'CACHE_SAVE_FAILED' };
  }
}

// LOCAL ONLY — no API call
function buildPromptFromScreening(screeningData) {
  try {
    const answers = Array.isArray(screeningData && screeningData.answers) ? screeningData.answers : [];
    const formattedAnswers = answers
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    const maskingScore = typeof (screeningData && screeningData.maskingScore) === 'number'
      ? screeningData.maskingScore
      : 0;
    const dominantTraits = Array.isArray(screeningData && screeningData.dominantTraits)
      ? screeningData.dominantTraits.join(', ')
      : '';
    const timestamp = screeningData && screeningData.timestamp
      ? screeningData.timestamp
      : new Date().toISOString();

    return {
      success: true,
      data: `Here are her screening responses:

${formattedAnswers}

Additional context:
- Masking score: ${maskingScore}/100
- Dominant patterns identified: ${dominantTraits}
- Screening completed: ${timestamp}

Please write her personalized insight report.`
    };
  } catch (error) {
    return { success: false, error: 'PROMPT_BUILD_FAILED' };
  }
}

// LOCAL ONLY — no API call
function getInsightHistory(userId = 'anonymous') {
  try {
    const cache = readCacheFile();
    const historySource = Array.isArray(cache.__history) ? cache.__history : [];
    const history = historySource
      .filter((entry) => entry && entry.userId === userId)
      .sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime());

    return { success: true, history };
  } catch (error) {
    return { success: false, error: 'INSIGHT_HISTORY_FAILED' };
  }
}

module.exports = {
  generateInsightReport,
  getInsightFromCache,
  saveInsightToCache,
  buildPromptFromScreening,
  getInsightHistory
};
