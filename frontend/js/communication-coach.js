const API_URL = `${window.location.protocol}//${window.location.hostname || '127.0.0.1'}:4000/api/communication-coach`;

function createPage() {
  return `
    <section class="coach-page">
      <div class="coach-shell">
        <div class="coach-header">
          <span class="section-tag">Private Sandbox</span>
          <h1 class="section-title">Communication <em>Coach</em></h1>
          <p class="section-body coach-intro">
            A quiet place to pressure-test a message or prepare for a conversation before it starts.
          </p>
        </div>

        <section class="coach-panel">
          <div class="coach-tabs">
            <button id="tab-message-helper" class="coach-tab is-active" type="button">
              Message Helper
            </button>
            <button id="tab-prep-mode" class="coach-tab" type="button">
              Prep Mode
            </button>
          </div>

          <form id="communication-coach-form" class="coach-form">
            <div id="mode-note" class="coach-mode-note">
              Paste the message you want to send, then add the situation so the coach can rewrite it without changing your voice.
            </div>

            <div class="coach-field">
              <label id="primary-label" class="coach-label" for="user-text">What do you want to say?</label>
              <textarea id="user-text" class="coach-textarea" name="userText" placeholder="Paste your draft here..."></textarea>
            </div>

            <div id="context-field" class="coach-field">
              <label id="context-label" class="coach-label" for="context-text">What's the situation?</label>
              <textarea id="context-text" class="coach-textarea coach-textarea--secondary" name="context" placeholder="Who is this to? What's going on?"></textarea>
            </div>

            <div class="coach-actions">
              <button id="submit-button" class="btn-primary coach-submit" type="submit">
                Help me say this
              </button>
              <p id="error-message" class="coach-error"></p>
            </div>
          </form>

          <section id="result-area" class="coach-results"></section>
        </section>
      </div>
    </section>
  `;
}

function renderMessageHelperResult(result) {
  return `
    <div class="coach-result-stack">
      <div class="coach-note">
        ${escapeHtml(result.note || '')}
      </div>
      <div class="coach-result-card">
        <div class="coach-result-topbar">
          <span class="coach-badge">
            ${escapeHtml(String(result.verdict || '').replaceAll('_', ' '))}
          </span>
          <button class="coach-copy" type="button" data-copy-text="${escapeHtml(result.rewrite || '')}">
            Copy rewrite
          </button>
        </div>
        <div class="coach-copy-block">
          ${escapeHtml(result.rewrite || '')}
        </div>
      </div>
    </div>
  `;
}

function renderPrepModeResult(result) {
  return `
    <div class="coach-grid">
      <article class="coach-mini-card">
        <div class="coach-mini-title">What to Expect</div>
        <div class="coach-mini-body">${escapeHtml(result.what_to_expect || '')}</div>
      </article>
      <article class="coach-mini-card">
        <div class="coach-mini-title">If You Get Stuck</div>
        <div class="coach-mini-body">${escapeHtml(result.rescue_phrase || '')}</div>
      </article>
      <article class="coach-mini-card">
        <div class="coach-mini-title">Permission Slip</div>
        <div class="coach-mini-body">${escapeHtml(result.permission || '')}</div>
      </article>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function applyMode(mode) {
  const messageTab = document.getElementById('tab-message-helper');
  const prepTab = document.getElementById('tab-prep-mode');
  const primaryLabel = document.getElementById('primary-label');
  const contextLabel = document.getElementById('context-label');
  const contextField = document.getElementById('context-field');
  const modeNote = document.getElementById('mode-note');
  const userText = document.getElementById('user-text');
  const contextText = document.getElementById('context-text');
  const submitButton = document.getElementById('submit-button');
  const resultArea = document.getElementById('result-area');
  const errorMessage = document.getElementById('error-message');

  resultArea.style.display = 'none';
  resultArea.innerHTML = '';
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';

  if (mode === 'message_helper') {
    messageTab.classList.add('is-active');
    prepTab.classList.remove('is-active');

    primaryLabel.textContent = 'What do you want to say?';
    contextLabel.textContent = "What's the situation?";
    modeNote.textContent =
      'Paste the message you want to send, then add the situation so the coach can rewrite it without changing your voice.';
    userText.placeholder = 'Paste your draft here...';
    contextText.placeholder = "Who is this to? What's going on?";
    contextText.classList.add('coach-textarea--secondary');
    contextField.classList.remove('is-hidden');
    submitButton.textContent = 'Help me say this';
  } else {
    prepTab.classList.add('is-active');
    messageTab.classList.remove('is-active');

    primaryLabel.textContent = "What's coming up?";
    modeNote.textContent =
      'Describe the meeting, event, or conversation. Prep Mode will return what to expect, one rescue phrase, and permission to leave.';
    userText.placeholder = 'Describe the meeting, event, or conversation...';
    contextText.value = '';
    contextText.classList.add('coach-textarea--secondary');
    contextField.classList.add('is-hidden');
    submitButton.textContent = 'Help me prepare';
  }
}

async function copyRewrite(text, trigger) {
  try {
    await navigator.clipboard.writeText(text);
    const original = trigger.textContent;
    trigger.textContent = 'Copied';
    setTimeout(() => {
      trigger.textContent = original;
    }, 1600);
  } catch {
    trigger.textContent = 'Copy failed';
    setTimeout(() => {
      trigger.textContent = 'Copy rewrite';
    }, 1600);
  }
}

function bootCommunicationCoach() {
  const root = document.getElementById('communication-coach-root');
  root.innerHTML = createPage();

  let mode = 'message_helper';

  const messageTab = document.getElementById('tab-message-helper');
  const prepTab = document.getElementById('tab-prep-mode');
  const form = document.getElementById('communication-coach-form');
  const submitButton = document.getElementById('submit-button');
  const errorMessage = document.getElementById('error-message');
  const resultArea = document.getElementById('result-area');

  messageTab.addEventListener('click', () => {
    mode = 'message_helper';
    applyMode(mode);
  });

  prepTab.addEventListener('click', () => {
    mode = 'prep_mode';
    applyMode(mode);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const userText = document.getElementById('user-text').value;
    const context = document.getElementById('context-text').value;

    submitButton.disabled = true;
    submitButton.textContent = 'thinking...';
    submitButton.style.opacity = '0.75';
    submitButton.style.cursor = 'not-allowed';
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    resultArea.style.display = 'none';
    resultArea.innerHTML = '';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode,
          userText,
          context
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Something went wrong.');
      }

      const parsed = JSON.parse(payload.result);
      resultArea.innerHTML =
        mode === 'message_helper'
          ? renderMessageHelperResult(parsed)
          : renderPrepModeResult(parsed);
      resultArea.style.display = 'block';

      const copyButton = resultArea.querySelector('[data-copy-text]');
      if (copyButton) {
        copyButton.addEventListener('click', () => {
          copyRewrite(parsed.rewrite || '', copyButton);
        });
      }
    } catch (error) {
      errorMessage.textContent =
        error instanceof Error ? error.message : 'Something went wrong.';
      errorMessage.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
      submitButton.style.cursor = 'pointer';
      submitButton.textContent = mode === 'message_helper' ? 'Help me say this' : 'Help me prepare';
    }
  });

  applyMode(mode);
}

document.addEventListener('DOMContentLoaded', bootCommunicationCoach);
