import { generateTailoredQuestionsWithAI, isOpenAIConfigured } from './openai-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const chatArea = document.getElementById('chatArea');
  const typingIndicator = document.getElementById('typingIndicator');

  const introText = 'Welcome. This assessment helps you notice patterns around sensory experience, social understanding, and masking.<br><br>Please answer each question in the way that feels most true for you.';

  const baseQuestions = [
    {
      id: 'sensory-1',
      text: 'I often find certain sounds, lights, textures, smells, or tastes uncomfortable or overwhelming (or strangely calming).',
      theme: 'sensory',
      weight: 1.5,
      followUp: {
        text: 'When this happens, does it usually build slowly through the day, or hit all at once in certain spaces?',
        weight: 0.8
      }
    },
    {
      id: 'sensory-2',
      text: 'After socializing for a while, I feel emotionally or physically drained or "shut down," even if I seemed "fine" at the time.',
      theme: 'sensory',
      weight: 1.5,
      followUp: {
        text: 'After that kind of draining moment, do you usually need quiet time, time alone, or extra recovery before you feel steady again?',
        weight: 0.8
      }
    },
    {
      id: 'sensory-3',
      text: 'I find it easier to be myself in one on one or small group settings than in big groups or noisy environments.',
      theme: 'sensory',
      weight: 1.2,
      followUp: {
        text: 'Does the setting itself make the biggest difference for you, such as noise, pace, or too many people at once?',
        weight: 0.6
      }
    },
    {
      id: 'social-1',
      text: 'I sometimes struggle to know what to say in conversations, or feel confused about social cues (tone, sarcasm, body language).',
      theme: 'social',
      weight: 1.5,
      followUp: {
        text: 'Is it usually harder to read what other people mean, or to know how to respond in the moment?',
        weight: 0.8
      }
    },
    {
      id: 'social-2',
      text: 'I have close friendships that are intense or emotionally draining, or I oscillate between intense connection and social withdrawal.',
      theme: 'social',
      weight: 1.2,
      followUp: {
        text: 'When this happens, does it often feel like you are giving a lot more energy than you can comfortably keep giving?',
        weight: 0.7
      }
    },
    {
      id: 'social-3',
      text: 'I often feel "different from others" in a way that is hard to explain, and others have labeled me as "too sensitive," "weird," or "shy."',
      theme: 'social',
      weight: 1.2,
      followUp: {
        text: 'Has that feeling of being different stayed fairly consistent across school, work, friendships, or family spaces?',
        weight: 0.7
      }
    },
    {
      id: 'masking-1',
      text: 'I often copy others\' body language, facial expressions, or speech patterns to "fit in" with different groups.',
      theme: 'masking',
      weight: 1.8,
      followUp: {
        text: 'Do you notice yourself doing that automatically before you even have time to think about it?',
        weight: 0.8
      }
    },
    {
      id: 'masking-2',
      text: 'I consciously practice or rehearse how I should look or act in social situations (e.g., smiling, hand gestures, eye contact).',
      theme: 'masking',
      weight: 1.8,
      followUp: {
        text: 'Does that rehearsal happen mostly before an event, or do you also keep checking yourself while it is happening?',
        weight: 0.8
      }
    },
    {
      id: 'masking-3',
      text: 'I develop "scripts" or lists of topics to use in conversations so I don\'t feel lost.',
      theme: 'masking',
      weight: 1.8,
      followUp: {
        text: 'Do those scripts help you feel steadier, even if they also take a lot of effort to keep ready?',
        weight: 0.8
      }
    },
    {
      id: 'masking-4',
      text: 'I feel like I am "performing" or "masking" myself in social settings rather than being my natural self.',
      theme: 'masking',
      weight: 1.8,
      followUp: {
        text: 'After social situations like that, do you often feel tired, flat, or less sure of who you were allowed to be?',
        weight: 0.8
      }
    },
    {
      id: 'masking-5',
      text: 'I study social rules (e.g., from TV, books, or psychology) to figure out how to behave "normally."',
      theme: 'masking',
      weight: 1.8,
      followUp: {
        text: 'Does learning those rules feel useful, even if it still leaves you unsure in real-time situations?',
        weight: 0.8
      }
    },
    {
      id: 'masking-6',
      text: 'I monitor my facial expressions or body language so others don\'t see anxiety, confusion, or discomfort.',
      theme: 'masking',
      weight: 1.5,
      followUp: {
        text: 'Do you find yourself checking your face, posture, or tone even when you would rather focus on the conversation itself?',
        weight: 0.7
      }
    },
    {
      id: 'masking-7',
      text: 'I sometimes deny or hide my needs (e.g., break, quiet space, sensory adjustments) to avoid drawing attention or seeming "difficult."',
      theme: 'masking',
      weight: 1.5,
      followUp: {
        text: 'When you hold those needs in, does it usually make the rest of the situation harder to get through comfortably?',
        weight: 0.7
      }
    }
  ];

  const responseOptions = [
    { label: 'Strongly Agree', score: 4 },
    { label: 'Agree', score: 3 },
    { label: 'Neutral / Unsure', score: 2 },
    { label: 'Disagree', score: 1 },
    { label: 'Strongly Disagree', score: 0 }
  ];

  const acknowledgments = [
    'Take your time.',
    'Thank you for sharing that.',
    'I hear you.',
    'That makes sense.',
    'Got it.'
  ];

  const completionMessage = 'Thank you. I\'ve got enough to put your pattern together now.';
  const tailoredIntro = 'Before I put your analysis together, I want to ask 3 more specific questions based on your earlier answers.';

  let started = false;
  let currentQuestionIndex = 0;
  let answers = {};
  let isFinished = false;
  let tailoredQuestions = [];
  let isGeneratingTailoredQuestions = false;
  let hasRequestedTailoredQuestions = false;

  function getAnswerScore(key) {
    return answers[key] ? answers[key].score : -1;
  }

  function buildBaseFlow() {
    const flow = [];

    baseQuestions.forEach((question, index) => {
      const baseKey = question.id;
      flow.push({
        key: baseKey,
        order: index,
        prompt: `Q${index + 1}. ${question.text}`,
        theme: question.theme,
        weight: question.weight,
        kind: 'base'
      });

      const selectedBaseAnswer = answers[baseKey];
      if (selectedBaseAnswer && selectedBaseAnswer.score >= 3 && question.followUp) {
        flow.push({
          key: `${question.id}-follow-up`,
          order: index + 0.5,
          prompt: `A gentle follow-up: ${question.followUp.text}`,
          theme: question.theme,
          weight: question.followUp.weight,
          kind: 'follow-up'
        });
      }
    });

    return flow;
  }

  function isBaseStageComplete(baseFlow) {
    return baseFlow.every((item) => Boolean(answers[item.key]));
  }

  function buildAssessmentSummary() {
    const baseFlow = buildBaseFlow();
    const themeScores = { masking: 0, social: 0, sensory: 0 };
    const answeredQuestions = baseFlow.map((item) => {
      const answer = answers[item.key];
      if (answer) {
        themeScores[item.theme] += item.weight * answer.score;
      }

      return {
        key: item.key,
        kind: item.kind,
        theme: item.theme,
        weight: item.weight,
        question: item.prompt,
        answer: answer ? answer.label : null,
        score: answer ? answer.score : null
      };
    });

    return {
      answeredQuestions,
      themeScores
    };
  }

  function buildFallbackTailoredQuestions() {
    const themeScores = { masking: 0, social: 0, sensory: 0 };

    baseQuestions.forEach((question) => {
      const baseScore = getAnswerScore(question.id);
      if (baseScore >= 0) {
        themeScores[question.theme] += baseScore * question.weight;
      }

      const followUpScore = getAnswerScore(`${question.id}-follow-up`);
      if (followUpScore >= 0 && question.followUp) {
        themeScores[question.theme] += followUpScore * question.followUp.weight;
      }
    });

    const rankedThemes = Object.entries(themeScores)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);

    const candidates = [
      {
        key: 'tailored-recovery',
        theme: rankedThemes[0] || 'sensory',
        weight: 1.1,
        prompt: 'When your system feels overloaded, does recovery usually depend more on quiet, predictability, or having less social demand around you?'
      },
      {
        key: 'tailored-masking-cost',
        theme: getAnswerScore('masking-4') >= 3 || getAnswerScore('masking-7') >= 3 ? 'masking' : rankedThemes[0] || 'masking',
        weight: 1.1,
        prompt: 'Do you often notice that getting through the day takes extra effort because you are managing how you look, sound, or respond for other people?'
      },
      {
        key: 'tailored-social-setting',
        theme: getAnswerScore('social-1') >= 3 || getAnswerScore('social-3') >= 3 ? 'social' : rankedThemes[1] || 'social',
        weight: 1.0,
        prompt: 'In situations that feel hard, is the biggest strain usually understanding what is happening, staying regulated, or keeping yourself socially "on track"?'
      },
      {
        key: 'tailored-sensory-pattern',
        theme: 'sensory',
        weight: 1.0,
        prompt: 'Do your harder moments tend to make more sense afterward when you look back and notice noise, texture, lights, crowds, or pace were building up?'
      },
      {
        key: 'tailored-belonging',
        theme: 'social',
        weight: 1.0,
        prompt: 'When connection feels difficult, does it usually feel more like being misunderstood, missing the rhythm, or having to work too hard to stay included?'
      },
      {
        key: 'tailored-needs',
        theme: 'masking',
        weight: 1.0,
        prompt: 'Do you often know what would help you feel better, but hold it back because asking for it feels too visible, inconvenient, or risky?'
      }
    ];

    const prioritizedKeys = [];

    rankedThemes.forEach((theme) => {
      candidates.forEach((candidate) => {
        if (candidate.theme === theme && !prioritizedKeys.includes(candidate.key)) {
          prioritizedKeys.push(candidate.key);
        }
      });
    });

    candidates.forEach((candidate) => {
      if (!prioritizedKeys.includes(candidate.key)) {
        prioritizedKeys.push(candidate.key);
      }
    });

    return prioritizedKeys.slice(0, 3).map((key, index) => {
      const candidate = candidates.find((item) => item.key === key);
      return {
        ...candidate,
        order: baseQuestions.length + index + 1,
        kind: 'tailored'
      };
    });
  }

  async function ensureTailoredQuestions() {
    if (tailoredQuestions.length || isGeneratingTailoredQuestions || hasRequestedTailoredQuestions === true) {
      return;
    }

    hasRequestedTailoredQuestions = true;
    isGeneratingTailoredQuestions = true;
    clearChat();
    render();

    try {
      if (isOpenAIConfigured()) {
        const result = await generateTailoredQuestionsWithAI(buildAssessmentSummary());
        tailoredQuestions = (result.questions || []).slice(0, 3).map((question, index) => ({
          key: question.key || `tailored-ai-${index + 1}`,
          theme: question.theme,
          weight: Math.max(0.8, Math.min(1.3, Number(question.weight) || 1)),
          prompt: question.prompt,
          order: baseQuestions.length + index + 1,
          kind: 'tailored'
        }));
      }
    } catch (error) {
      console.error('Unable to generate tailored questions with AI.', error);
    }

    if (!tailoredQuestions.length) {
      tailoredQuestions = buildFallbackTailoredQuestions();
    }

    isGeneratingTailoredQuestions = false;
    clearChat();
    render();
  }

  function getNextBaseQuestionIndex(baseFlow) {
    const nextIndex = baseFlow.findIndex((item) => !answers[item.key]);
    return nextIndex === -1 ? baseFlow.length : nextIndex;
  }

  function areTailoredQuestionsComplete() {
    return tailoredQuestions.length > 0 && tailoredQuestions.every((item) => Boolean(answers[item.key]));
  }

  function buildScores(flow) {
    const scores = { masking: 0, social: 0, sensory: 0 };

    flow.forEach((item) => {
      const answer = answers[item.key];
      if (!answer) return;
      scores[item.theme] += item.weight * answer.score;
    });

    return scores;
  }

  function buildMaxScores(flow) {
    const maxScores = { masking: 0, social: 0, sensory: 0 };

    flow.forEach((item) => {
      maxScores[item.theme] += item.weight * 4;
    });

    return maxScores;
  }

  function syncProgress() {
    const baseFlow = buildBaseFlow();
    const baseComplete = isBaseStageComplete(baseFlow);

    currentQuestionIndex = getNextBaseQuestionIndex(baseFlow);
    isFinished = baseComplete && areTailoredQuestionsComplete();

    return { baseFlow, baseComplete };
  }

  function renderAnswerGroup(item) {
    const selectedAnswer = answers[item.key];

    return `
      <div class="quick-prompts answer-row" data-question-key="${item.key}">
        ${responseOptions.map((option) => `
          <button class="prompt-chip answer-chip${selectedAnswer && selectedAnswer.score === option.score ? ' is-selected' : ''}" data-score="${option.score}" data-label="${escapeHTML(option.label)}" aria-pressed="${selectedAnswer && selectedAnswer.score === option.score ? 'true' : 'false'}">
            <span class="answer-chip-radio" aria-hidden="true"></span>
            <span class="answer-chip-label">${escapeHTML(option.label)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function render() {
    const messages = [];
    const { baseFlow, baseComplete } = syncProgress();

    messages.push(`
      <div class="message-wrapper nova fade-in-slow">
        <div class="nova-avatar-container">
          <div class="nova-avatar">🌸</div>
          <span class="nova-name">Nova</span>
        </div>
        <div class="message-bubble nova-bubble">${introText}</div>
      </div>
    `);

    if (!started) {
      messages.push(`
        <div class="quick-prompts fade-in-slow-delayed" id="quickPrompts">
          <button class="prompt-chip begin-chip" data-action="begin">Begin</button>
        </div>
      `);
    }

    if (started) {
      const visibleBaseCount = baseComplete
        ? baseFlow.length
        : Math.min(currentQuestionIndex + 1, baseFlow.length);

      for (let i = 0; i < visibleBaseCount; i += 1) {
        const item = baseFlow[i];
        const ack = i === 0 ? '' : `${acknowledgments[i % acknowledgments.length]}<br><br>`;

        messages.push(`
          <div class="message-wrapper nova">
            <div class="message-bubble nova-bubble${item.kind === 'follow-up' ? ' followup-bubble' : ''}">${ack}${escapeHTML(item.prompt)}</div>
          </div>
        `);

        messages.push(renderAnswerGroup(item));
      }

      if (baseComplete) {
        messages.push(`
          <div class="message-wrapper nova">
            <div class="message-bubble nova-bubble followup-bubble">${tailoredIntro}</div>
          </div>
        `);

        if (isGeneratingTailoredQuestions) {
          messages.push(`
            <div class="message-wrapper nova">
              <div class="message-bubble nova-bubble tailored-bubble">I’m shaping 3 more specific questions from your answers now.</div>
            </div>
          `);
        } else if (tailoredQuestions.length) {
          tailoredQuestions.forEach((item, index) => {
            messages.push(`
              <div class="message-wrapper nova">
                <div class="message-bubble nova-bubble tailored-bubble">${escapeHTML(`Specific question ${index + 1}. ${item.prompt}`)}</div>
              </div>
            `);

            messages.push(renderAnswerGroup(item));
          });
        }
      }
    }

    if (isFinished) {
      messages.push(`
        <div class="message-wrapper nova">
          <div class="message-bubble nova-bubble">${completionMessage}</div>
        </div>
      `);
    }

    typingIndicator.insertAdjacentHTML('beforebegin', messages.join(''));
    bindEvents();
    scrollToBottom();

    if (started && baseComplete && !tailoredQuestions.length && !isGeneratingTailoredQuestions) {
      void ensureTailoredQuestions();
    }
  }

  function persistAndFinish(baseFlow) {
    const fullFlow = [...baseFlow, ...tailoredQuestions];

    localStorage.setItem('neurobloom_scores', JSON.stringify(buildScores(fullFlow)));
    localStorage.setItem('neurobloom_max_scores', JSON.stringify(buildMaxScores(fullFlow)));
    localStorage.setItem('neurobloom_answers', JSON.stringify(answers));
    localStorage.setItem('neurobloom_tailored_questions', JSON.stringify(tailoredQuestions));
    localStorage.removeItem('neurobloom_ai_feedback');
    localStorage.setItem('neurobloom_assessment_summary', JSON.stringify({
      answers,
      scores: buildScores(fullFlow),
      maxScores: buildMaxScores(fullFlow),
      tailoredQuestions
    }));

    clearChat();
    render();
    window.setTimeout(() => {
      window.location.href = '/results.html';
    }, 1800);
  }

  function bindEvents() {
    const beginBtn = chatArea.querySelector('[data-action="begin"]');
    if (beginBtn) {
      beginBtn.onclick = () => {
        started = true;
        currentQuestionIndex = 0;
        clearChat();
        render();
      };
    }

    chatArea.querySelectorAll('.answer-row').forEach((row) => {
      const questionKey = row.dataset.questionKey;
      row.querySelectorAll('.answer-chip').forEach((button) => {
        button.onclick = () => {
          const label = button.dataset.label;
          const score = Number(button.dataset.score);
          const wasTailored = questionKey.startsWith('tailored-');

          answers[questionKey] = { label, score };

          if (!questionKey.endsWith('-follow-up') && !wasTailored && score < 3) {
            delete answers[`${questionKey}-follow-up`];
          }

          const { baseFlow, baseComplete } = syncProgress();

          if (!wasTailored && baseComplete && !tailoredQuestions.length) {
            clearChat();
            render();
            return;
          }

          if (baseComplete && tailoredQuestions.length) {
            isFinished = areTailoredQuestionsComplete();
          }

          if (isFinished) {
            persistAndFinish(baseFlow);
            return;
          }

          clearChat();
          render();
        };
      });
    });
  }

  function clearChat() {
    chatArea.querySelectorAll('.message-wrapper, .quick-prompts').forEach((node) => {
      if (node !== typingIndicator) {
        node.remove();
      }
    });
  }

  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  render();
});
