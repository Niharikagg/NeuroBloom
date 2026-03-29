import React, { useState } from 'react';

const styles = {
  shell: {
    background: 'var(--glass)',
    border: '1px solid rgba(59, 37, 53, 0.12)',
    borderRadius: '32px',
    boxShadow: '0 18px 48px rgba(59, 37, 53, 0.08)',
    color: 'var(--text)',
    padding: '32px',
    width: '100%'
  },
  header: {
    display: 'grid',
    gap: '12px',
    marginBottom: '24px'
  },
  tag: {
    color: 'var(--rose)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase'
  },
  title: {
    color: 'var(--deep)',
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    lineHeight: 1.15
  },
  body: {
    color: 'var(--text)',
    fontSize: '1rem',
    lineHeight: 1.7
  },
  toggleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px'
  },
  toggleButton: {
    background: 'transparent',
    border: '2px solid rgba(59, 37, 53, 0.15)',
    borderRadius: '999px',
    color: 'var(--deep)',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 500,
    padding: '12px 20px',
    transition: 'all 0.3s ease'
  },
  activeToggleButton: {
    background: 'var(--rose)',
    borderColor: 'var(--rose)',
    boxShadow: '0 10px 30px var(--rose-glow)',
    color: 'var(--white)'
  },
  form: {
    display: 'grid',
    gap: '20px'
  },
  field: {
    display: 'grid',
    gap: '10px'
  },
  label: {
    color: 'var(--deep)',
    fontSize: '0.95rem',
    fontWeight: 600
  },
  textarea: {
    background: 'var(--white)',
    border: '1px solid rgba(59, 37, 53, 0.14)',
    borderRadius: '20px',
    color: 'var(--text)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    lineHeight: 1.6,
    minHeight: '140px',
    padding: '18px',
    resize: 'vertical'
  },
  submit: {
    alignItems: 'center',
    background: 'var(--rose)',
    border: 'none',
    borderRadius: '999px',
    boxShadow: '0 10px 30px var(--rose-glow)',
    color: 'var(--white)',
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    justifyContent: 'center',
    minHeight: '56px',
    padding: '16px 28px'
  },
  disabledSubmit: {
    cursor: 'not-allowed',
    opacity: 0.75
  },
  error: {
    color: 'var(--deep)',
    fontSize: '0.95rem'
  },
  callout: {
    background: 'var(--blush)',
    borderRadius: '24px',
    color: 'var(--deep)',
    lineHeight: 1.7,
    padding: '20px'
  },
  resultBlock: {
    background: 'var(--white)',
    border: '1px solid rgba(59, 37, 53, 0.12)',
    borderRadius: '24px',
    display: 'grid',
    gap: '12px',
    padding: '24px'
  },
  copyable: {
    background: 'var(--sand)',
    borderRadius: '20px',
    color: 'var(--deep)',
    lineHeight: 1.7,
    padding: '18px',
    whiteSpace: 'pre-wrap'
  },
  badge: {
    alignSelf: 'start',
    background: 'var(--lavender)',
    borderRadius: '999px',
    color: 'var(--deep)',
    display: 'inline-flex',
    fontSize: '0.85rem',
    fontWeight: 600,
    padding: '8px 12px',
    textTransform: 'capitalize'
  },
  cards: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
  },
  card: {
    background: 'var(--white)',
    border: '1px solid rgba(59, 37, 53, 0.12)',
    borderRadius: '24px',
    display: 'grid',
    gap: '10px',
    padding: '22px'
  },
  cardTitle: {
    color: 'var(--deep)',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  cardBody: {
    color: 'var(--text)',
    lineHeight: 1.7
  }
};

const initialFormState = {
  userText: '',
  context: ''
};

function parseResult(result) {
  if (typeof result !== 'string') {
    return null;
  }

  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

export default function CommunicationCoach() {
  const [mode, setMode] = useState('message_helper');
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/communication-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode,
          userText: form.userText,
          context: form.context
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Something went wrong.');
      }

      const parsed = parseResult(payload.result);
      if (!parsed) {
        throw new Error('The response format was invalid.');
      }

      setResult(parsed);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setError('');
    setResult(null);
    setForm(initialFormState);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  const isMessageHelper = mode === 'message_helper';
  const submitLabel = isMessageHelper ? 'Help me say this' : 'Help me prepare';

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <span style={styles.tag}>Private Sandbox</span>
        <h2 style={styles.title}>Communication Coach</h2>
        <p style={styles.body}>
          A quiet place to test words before they leave your mouth or your phone.
        </p>
      </div>

      <div style={styles.toggleRow}>
        <button
          type="button"
          onClick={() => handleModeChange('message_helper')}
          style={{
            ...styles.toggleButton,
            ...(isMessageHelper ? styles.activeToggleButton : null)
          }}
        >
          Message Helper
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('prep_mode')}
          style={{
            ...styles.toggleButton,
            ...(!isMessageHelper ? styles.activeToggleButton : null)
          }}
        >
          Prep Mode
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="communication-coach-user-text" style={styles.label}>
            {isMessageHelper ? 'What do you want to say?' : "What's coming up?"}
          </label>
          <textarea
            id="communication-coach-user-text"
            name="userText"
            onChange={handleFieldChange}
            placeholder={
              isMessageHelper
                ? 'Paste your draft here...'
                : 'Describe the meeting, event, or conversation...'
            }
            style={styles.textarea}
            value={form.userText}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="communication-coach-context" style={styles.label}>
            {isMessageHelper ? "What's the situation?" : 'Context'}
          </label>
          <textarea
            id="communication-coach-context"
            name="context"
            onChange={handleFieldChange}
            placeholder={
              isMessageHelper
                ? "Who is this to? What's going on?"
                : 'Anything else that would help the coach understand the situation...'
            }
            style={{
              ...styles.textarea,
              minHeight: isMessageHelper ? '120px' : '100px'
            }}
            value={form.context}
          />
        </div>

        <div style={styles.field}>
          <button
            disabled={loading}
            style={{
              ...styles.submit,
              ...(loading ? styles.disabledSubmit : null)
            }}
            type="submit"
          >
            {loading ? 'thinking...' : submitLabel}
          </button>
          {error ? <p style={styles.error}>{error}</p> : null}
        </div>
      </form>

      {result && isMessageHelper ? (
        <div style={{ ...styles.form, marginTop: '24px' }}>
          <div style={styles.callout}>{result.note}</div>
          <div style={styles.resultBlock}>
            <span style={styles.badge}>{String(result.verdict || '').replaceAll('_', ' ')}</span>
            <div style={styles.copyable}>{result.rewrite}</div>
          </div>
        </div>
      ) : null}

      {result && !isMessageHelper ? (
        <div style={{ ...styles.cards, marginTop: '24px' }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>What to Expect</div>
            <div style={styles.cardBody}>{result.what_to_expect}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>If You Get Stuck</div>
            <div style={styles.cardBody}>{result.rescue_phrase}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Permission Slip</div>
            <div style={styles.cardBody}>{result.permission}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
