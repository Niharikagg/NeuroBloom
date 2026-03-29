/**
 * InsightEngine.jsx
 * Frontend component for AI Insight Engine feature.
 *
 * Self-contained report experience with three phases:
 * LOADING → REPORT → REFLECTION
 *
 * Uses direct Claude fetch by default and does not modify any existing file.
 */

import { useEffect, useState } from 'react';

const API_URL = 'https://api.anthropic.com/v1/messages';
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

const LOADING_LINE_ONE = [
  'Reading your responses...',
  'Looking for patterns...',
  'Connecting the dots...'
];

const LOADING_LINE_TWO = [
  'This is just for you.',
  'No labels. No judgement.',
  'You know yourself best.'
];

function buildPromptFromScreening(screeningData) {
  try {
    const answers = Array.isArray(screeningData && screeningData.answers) ? screeningData.answers : [];
    const formattedAnswers = answers
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    return `Here are her screening responses:

${formattedAnswers}

Additional context:
- Masking score: ${typeof screeningData?.maskingScore === 'number' ? screeningData.maskingScore : 0}/100
- Dominant patterns identified: ${Array.isArray(screeningData?.dominantTraits) ? screeningData.dominantTraits.join(', ') : ''}
- Screening completed: ${screeningData?.timestamp || new Date().toISOString()}

Please write her personalized insight report.`;
  } catch (error) {
    return 'Here are her screening responses:\n\nAdditional context:\n- Masking score: 0/100\n- Dominant patterns identified: \n- Screening completed: unknown\n\nPlease write her personalized insight report.';
  }
}

export default function InsightEngine({ screeningData, onComplete, onLog, apiService }) {
  const [phase, setPhase] = useState('LOADING');
  const [insightData, setInsightData] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % LOADING_LINE_ONE.length);
    }, 2500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInsight() {
      try {
        setError('');
        setPhase('LOADING');

        let parsed;

        if (apiService && typeof apiService.generateInsightReport === 'function') {
          const result = await apiService.generateInsightReport(screeningData);
          if (!result || !result.success || !result.data) {
            throw new Error('INSIGHT_SERVICE_FAILED');
          }
          parsed = result.data;
        } else {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: buildPromptFromScreening(screeningData) }]
            })
          });

          if (!response.ok) {
            throw new Error('INSIGHT_REQUEST_FAILED');
          }

          const data = await response.json();
          const text = Array.isArray(data.content) ? data.content.map((i) => i.text || '').join('') : '';
          const clean = text.replace(/```json|```/g, '').trim();
          parsed = JSON.parse(clean);
        }

        if (!active) {
          return;
        }

        setInsightData(parsed);
        setPhase('REPORT');
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError('Something went wrong. Want to try again?');
      }
    }

    loadInsight();

    return () => {
      active = false;
    };
  }, [screeningData]);

  const styles = {
    shell: {
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      padding: '24px',
      background: 'var(--color-background-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: 'border-box',
      overflowX: 'hidden'
    },
    centerWrap: {
      minHeight: '72vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center'
    },
    orb: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#9FE1CB',
      boxShadow: '0 18px 36px rgba(93, 202, 165, 0.18)',
      animation: 'insightPulse 2.8s ease-in-out infinite'
    },
    label: {
      fontSize: '11px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)',
      margin: 0
    },
    headline: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: '26px',
      lineHeight: 1.3,
      color: 'var(--color-text-primary)',
      margin: 0
    },
    rule: {
      width: '40px',
      height: '1px',
      background: 'var(--color-border-tertiary)',
      margin: '0 auto'
    },
    body: {
      fontSize: '16px',
      lineHeight: 1.8,
      color: 'var(--color-text-secondary)',
      margin: 0
    },
    patternCard: {
      background: 'var(--color-background-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '16px 18px',
      boxSizing: 'border-box'
    },
    patternTitle: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#0F6E56',
      margin: 0
    },
    patternInsight: {
      fontSize: '14px',
      lineHeight: 1.7,
      color: 'var(--color-text-primary)',
      margin: '6px 0 0'
    },
    patternReframe: {
      fontSize: '13px',
      lineHeight: 1.6,
      color: 'var(--color-text-secondary)',
      fontStyle: 'italic',
      margin: '8px 0 0',
      paddingTop: '8px',
      borderTop: '0.5px solid var(--color-border-tertiary)'
    },
    energyCost: {
      borderLeft: '2px solid #9FE1CB',
      paddingLeft: '14px',
      fontSize: '15px',
      lineHeight: 1.7,
      color: 'var(--color-text-secondary)',
      margin: 0
    },
    closing: {
      fontFamily: "'DM Serif Display', serif",
      fontStyle: 'italic',
      fontSize: '18px',
      lineHeight: 1.5,
      textAlign: 'center',
      color: 'var(--color-text-primary)',
      margin: 0
    },
    note: {
      fontSize: '12px',
      color: 'var(--color-text-tertiary)',
      fontStyle: 'italic',
      textAlign: 'center',
      margin: 0
    },
    buttonRow: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '24px'
    },
    primaryButton: {
      minHeight: '44px',
      borderRadius: 'var(--border-radius-lg)',
      border: '0.5px solid var(--color-text-primary)',
      background: 'var(--color-text-primary)',
      color: 'var(--color-background-primary)',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px',
      padding: '13px 28px',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    ghostButton: {
      minHeight: '44px',
      borderRadius: 'var(--border-radius-lg)',
      border: '0.5px solid var(--color-border-tertiary)',
      background: 'transparent',
      color: 'var(--color-text-primary)',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px',
      padding: '13px 28px',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    loadingText: {
      fontSize: '14px',
      lineHeight: 1.7,
      color: 'var(--color-text-tertiary)',
      margin: 0
    },
    savedText: {
      fontSize: '12px',
      color: 'var(--color-text-tertiary)',
      textAlign: 'center',
      margin: 0
    }
  };

  const responsiveHeadline = typeof window !== 'undefined' && window.innerWidth < 400 ? '22px' : '26px';
  const responsiveCardPadding = typeof window !== 'undefined' && window.innerWidth < 400 ? '12px 14px' : '16px 18px';

  async function handleSave() {
    try {
      if (typeof onLog === 'function' && insightData) {
        onLog({
          userId: screeningData?.userId || 'anonymous',
          insight: insightData,
          timestamp: new Date().toISOString()
        });
      }
      setSaved(true);
    } catch (error) {
      setSaved(false);
    }
  }

  if (error) {
    return (
      <div style={styles.shell}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes insightPulse {
            0%, 100% { transform: scale(0.96); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={styles.centerWrap}>
          <p style={styles.body}>{error}</p>
          <button type="button" style={{ ...styles.ghostButton, marginTop: '16px' }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'LOADING') {
    return (
      <div style={styles.shell}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes insightPulse {
            0%, 100% { transform: scale(0.96); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={styles.centerWrap}>
          <div style={styles.orb} />
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={styles.loadingText}>{LOADING_LINE_ONE[lineIndex]}</p>
            <p style={styles.loadingText}>{LOADING_LINE_TWO[lineIndex]}</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'REFLECTION') {
    return (
      <div style={styles.shell}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes insightPulse {
            0%, 100% { transform: scale(0.96); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{ ...styles.centerWrap, gap: '18px', animation: 'fadeUp 0.5s ease forwards', animationDelay: '400ms', opacity: 0 }}>
          <p style={{ ...styles.closing, fontSize: '20px' }}>This is yours. Come back to it whenever you need.</p>
          <p style={styles.note}>Your patterns are being added to your personal map.</p>
          <div style={styles.orb} />
          <button
            type="button"
            style={{ ...styles.primaryButton, width: '100%', maxWidth: '240px' }}
            onClick={() => {
              if (typeof onComplete === 'function') {
                onComplete();
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes insightPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.85; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeUp 0.5s ease forwards', opacity: 0 }}>
          <p style={styles.label}>your insight</p>
          <h2 style={{ ...styles.headline, fontSize: responsiveHeadline }}>{insightData?.headline}</h2>
          <div style={styles.rule} />
        </div>

        <div style={{ animation: 'fadeUp 0.5s ease forwards', animationDelay: '400ms', opacity: 0 }}>
          <p style={styles.body}>{insightData?.opening}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(insightData?.patterns || []).map((pattern, index) => (
            <div
              key={`${pattern.title}-${index}`}
              style={{
                ...styles.patternCard,
                padding: responsiveCardPadding,
                animation: 'fadeUp 0.5s ease forwards',
                animationDelay: `${600 + (index * 200)}ms`,
                opacity: 0
              }}
            >
              <p style={styles.patternTitle}>{pattern.title}</p>
              <p style={styles.patternInsight}>{pattern.insight}</p>
              <p style={styles.patternReframe}>{pattern.reframe}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeUp 0.5s ease forwards', animationDelay: '1200ms', opacity: 0 }}>
          <p style={styles.label}>what this costs you</p>
          <p style={styles.energyCost}>{insightData?.energyCost}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeUp 0.5s ease forwards', animationDelay: '1400ms', opacity: 0 }}>
          <p style={styles.closing}>{insightData?.closingMessage}</p>
          <p style={styles.note}>{insightData?.importantNote}</p>
        </div>

        <div style={{ ...styles.buttonRow, animation: 'fadeUp 0.5s ease forwards', animationDelay: '1600ms', opacity: 0 }}>
          <button type="button" style={styles.primaryButton} onClick={() => setPhase('REFLECTION')}>
            I see myself in this
          </button>
          <button type="button" style={styles.ghostButton} onClick={handleSave}>
            Save this insight
          </button>
          {saved && <p style={styles.savedText}>Saved</p>}
        </div>
      </div>
    </div>
  );
}
