import { generateFinalFeedbackWithAI, isOpenAIConfigured } from './openai-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  const resultsArea = document.getElementById('resultsArea');
  const resultsInput = document.getElementById('resultsInput');

  const savedScores = localStorage.getItem('neurobloom_scores');
  const savedMaxScores = localStorage.getItem('neurobloom_max_scores');
  const savedAnswers = localStorage.getItem('neurobloom_answers');
  const savedTailoredQuestions = localStorage.getItem('neurobloom_tailored_questions');
  const savedAssessmentSummary = localStorage.getItem('neurobloom_assessment_summary');
  const savedAiFeedback = localStorage.getItem('neurobloom_ai_feedback');

  let scores = { masking: 0, social: 0, sensory: 0 };
  let maxScores = { masking: 48.0, social: 15.6, sensory: 16.8 };
  let answers = {};
  let tailoredQuestions = [];
  let assessmentSummary = null;

  if (savedScores) {
    scores = JSON.parse(savedScores);
  }
  if (savedMaxScores) {
    maxScores = JSON.parse(savedMaxScores);
  }
  if (savedAnswers) {
    answers = JSON.parse(savedAnswers);
  }
  if (savedTailoredQuestions) {
    tailoredQuestions = JSON.parse(savedTailoredQuestions);
  }
  if (savedAssessmentSummary) {
    assessmentSummary = JSON.parse(savedAssessmentSummary);
  }

  const percentages = {
    masking: maxScores.masking ? Math.min(Math.round((scores.masking / maxScores.masking) * 100), 100) : 0,
    social: maxScores.social ? Math.min(Math.round((scores.social / maxScores.social) * 100), 100) : 0,
    sensory: maxScores.sensory ? Math.min(Math.round((scores.sensory / maxScores.sensory) * 100), 100) : 0
  };

  const sorted = [
    { cat: 'masking', val: percentages.masking },
    { cat: 'social', val: percentages.social },
    { cat: 'sensory', val: percentages.sensory }
  ].sort((a, b) => b.val - a.val);

  let highestCat = sorted[0].cat;
  if (sorted[0].val - sorted[1].val <= 8) {
    highestCat = 'mixed';
  }

  const resultsData = {
    masking: {
      label: 'Camouflaging / Masking',
      insight: 'Your responses suggest that a lot of energy may go into studying, rehearsing, hiding needs, or performing a version of yourself that feels safer in social settings.'
    },
    social: {
      label: 'Social Confusion & Understanding',
      insight: 'Your answers suggest that social cues, connection, and feeling different may be a meaningful part of your experience.'
    },
    sensory: {
      label: 'Sensory Sensitivity & Overload',
      insight: 'Your responses suggest that sensory overload may be playing a strong role in your daily life.'
    },
    mixed: {
      label: 'Mixed Pattern Profile',
      insight: 'Your results show overlap across sensory overload, social understanding, and masking.'
    }
  };

  function answerScore(key) {
    return answers[key] ? answers[key].score : -1;
  }

  function buildFallbackFeedback() {
    const notes = [];

    if (highestCat === 'masking' || answerScore('masking-4') >= 3 || answerScore('masking-7') >= 3) {
      notes.push('A strong thread here is the amount of effort it may take to stay socially readable while also protecting your own needs.');
    }

    if (highestCat === 'sensory' || answerScore('sensory-1') >= 3 || answerScore('sensory-2') >= 3) {
      notes.push('Your answers also suggest that overload may not just be emotional. It may be tied to environments, pace, and how long your nervous system has had to keep adapting.');
    }

    if (highestCat === 'social' || answerScore('social-1') >= 3 || answerScore('social-3') >= 3) {
      notes.push('There is also a pattern of extra interpretation work, where connection may require more decoding, checking, or self-monitoring than other people notice.');
    }

    if (tailoredQuestions.some((question) => answerScore(question.key) >= 3 && question.theme === 'sensory')) {
      notes.push('The more specific questions point toward your harder moments being shaped by regulation and recovery, not only by willpower or motivation.');
    }

    if (tailoredQuestions.some((question) => answerScore(question.key) >= 3 && question.theme === 'masking')) {
      notes.push('The tailored responses also suggest that managing visibility, effort, and self-presentation may be costing more energy than it seems from the outside.');
    }

    if (tailoredQuestions.some((question) => answerScore(question.key) >= 3 && question.theme === 'social')) {
      notes.push('Your later answers suggest that the social strain may come less from a lack of care and more from how much processing is happening in the background.');
    }

    if (!notes.length) {
      notes.push('Your answers show a meaningful pattern even where things are mixed. What stands out most is that the strain seems real, layered, and worth taking seriously.');
    }

    return {
      overview: resultsData[highestCat].insight,
      observations: notes.slice(0, 3)
    };
  }

  function formatFeedback(feedback) {
    return `
      <p>${feedback.overview}</p>
      ${feedback.observations.map((note) => `<p>${note}</p>`).join('')}
    `;
  }

  async function loadAiFeedback() {
    if (savedAiFeedback) {
      return JSON.parse(savedAiFeedback);
    }

    if (!isOpenAIConfigured()) {
      return buildFallbackFeedback();
    }

    try {
      const aiFeedback = await generateFinalFeedbackWithAI({
        highestPattern: resultsData[highestCat].label,
        percentages,
        tailoredQuestions,
        assessmentSummary,
        answers
      });

      localStorage.setItem('neurobloom_ai_feedback', JSON.stringify(aiFeedback));
      return aiFeedback;
    } catch (error) {
      console.error('Unable to generate final AI feedback.', error);
      return buildFallbackFeedback();
    }
  }

  document.getElementById('patternLabel').textContent = resultsData[highestCat].label;
  document.getElementById('insightText').innerHTML = `<p>${resultsData[highestCat].insight}</p>`;

  document.getElementById('barMasking').style.width = `${percentages.masking}%`;
  document.getElementById('numMasking').textContent = `${percentages.masking}%`;
  document.getElementById('barExecutive').style.width = `${percentages.social}%`;
  document.getElementById('numExecutive').textContent = `${percentages.social}%`;
  document.getElementById('barSensory').style.width = `${percentages.sensory}%`;
  document.getElementById('numSensory').textContent = `${percentages.sensory}%`;

  loadAiFeedback().then((feedback) => {
    document.getElementById('insightText').innerHTML = formatFeedback(feedback);
  });

  setTimeout(() => {
    loadingState.classList.add('fade-out');

    setTimeout(() => {
      loadingState.style.display = 'none';
      resultsArea.classList.remove('hidden');
      if (resultsInput) {
        resultsInput.classList.remove('hidden');
      }
    }, 1200);
  }, 4000);
});
