document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatArea = document.getElementById('chatArea');
  const quickPrompts = document.getElementById('quickPrompts');
  const typingIndicator = document.getElementById('typingIndicator');

  // Disable text input permanently for chip-only flow
  chatInput.disabled = true;
  chatInput.placeholder = "Please select an option above...";
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.5';
  sendBtn.style.cursor = 'default';

  // Initialize adaptive screening engine
  const screeningEngine = new AdaptiveScreeningEngine();
  
  const acknowledgments = [
    "I hear you.",
    "That makes sense.",
    "Thank you for that.",
    "Okay.",
    "I understand.",
    "Go on.",
    "Got it."
  ];
  
  const completionMessage = "Thank you. I've got enough to understand your pattern now.";

  let currentQuestion = null;
  let isChatFinished = false;
  let responseCount = 0;

  // Initial chips listener
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      processUserChoice(chip.textContent, null, null);
    });
  });

  /**
   * Main handler for user selections
   * Supports both main questions and follow-ups
   */
  function processUserChoice(text, score = null, nextId = null) {
    if (isChatFinished) return;

    // Hide initial prompt chips on first interaction
    if (responseCount === 0 && quickPrompts) {
      quickPrompts.style.transition = 'opacity 0.5s ease';
      quickPrompts.style.opacity = '0';
      setTimeout(() => quickPrompts.remove(), 500);
    }

    // Append user message bubble
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-wrapper user';
    msgDiv.style.opacity = '0';
    msgDiv.style.animation = 'fadeIn 0.4s ease forwards';
    msgDiv.innerHTML = `<div class="message-bubble user-bubble">${escapeHTML(text)}</div>`;
    chatArea.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();

    // First interaction: intro acknowledgment
    if (responseCount === 0) {
      responseCount++;
      setTimeout(() => askNextQuestion(), 800);
      return;
    }

    // Record response in screening engine
    if (currentQuestion && score !== null) {
      screeningEngine.recordResponse(currentQuestion.id, text, score);
      responseCount++;
    }

    // Check if we should go deeper (follow-up) or move next
    if (nextId) {
      // Explicit next question ID provided (deep branching)
      currentQuestion = screeningEngine.findQuestionById(nextId);
      setTimeout(() => showFollowUp(currentQuestion), 600);
    } else if (currentQuestion && currentQuestion.followUps && currentQuestion.followUps[text]) {
      // Standard follow-up exists for this response
      const followUp = currentQuestion.followUps[text][0];
      setTimeout(() => showFollowUpWithOptions(followUp.text, followUp.options), 600);
    } else {
      // Move to next main question
      if (responseCount < 8) { // Adaptive length: 6-8 questions
        setTimeout(() => askNextQuestion(), 600);
      } else {
        // Finished
        setTimeout(() => finishScreening(), 600);
      }
    }
  }

  /**
   * Ask the next adaptive question
   */
  function askNextQuestion() {
    currentQuestion = screeningEngine.getNextQuestion();
    
    if (!currentQuestion) {
      finishScreening();
      return;
    }

    let responseText = currentQuestion.text;
    
    // Add acknowledgment before question (except first)
    if (responseCount > 1) {
      const ack = acknowledgments[(responseCount - 1) % acknowledgments.length];
      responseText = ack + "<br><br>" + currentQuestion.text;
    }

    // Determine default options based on question type
    let options = [
      { label: "Yes", score: 1.0 },
      { label: "Sometimes", score: 0.5 },
      { label: "Not really", score: 0 }
    ];

    showNovaMessage({
      text: responseText,
      options: options,
      questionId: currentQuestion.id
    });
  }

  /**
   * Show a follow-up question with branching options
   */
  function showFollowUpWithOptions(text, options) {
    showNovaMessage({
      text: text,
      options: options.map(opt => ({
        label: opt.label,
        score: opt.score,
        nextId: opt.next
      }))
    });
  }

  /**
   * Show a follow-up with simple acknowledgment
   */
  function showFollowUp(question) {
    let followUpText = question.text;
    
    const ack = acknowledgments[responseCount % acknowledgments.length];
    followUpText = ack + "<br><br>" + followUpText;

    let options = [
      { label: "Yes", score: 1.0 },
      { label: "Sometimes", score: 0.5 },
      { label: "Not really", score: 0 }
    ];

    showNovaMessage({
      text: followUpText,
      options: options
    });
  }

  /**
   * Core function to display Nova's message and options
   */
  function showNovaMessage(messageObj) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-wrapper nova';
    msgDiv.style.opacity = '0';
    msgDiv.style.animation = 'fadeIn 0.5s ease forwards 0.2s';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble nova-bubble';
    bubble.innerHTML = messageObj.text;
    msgDiv.appendChild(bubble);

    // Create options
    if (messageObj.options) {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'nova-options';
      optionsDiv.style.opacity = '0';
      optionsDiv.style.animation = 'fadeIn 0.5s ease forwards 0.4s';

      messageObj.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'nova-option-btn';
        btn.textContent = option.label;
        btn.setAttribute('data-score', option.score);
        btn.onclick = (e) => {
          e.preventDefault();
          const score = parseFloat(option.score);
          const nextId = option.nextId || null;
          processUserChoice(option.label, score, nextId);
        };
        optionsDiv.appendChild(btn);
      });

      msgDiv.appendChild(optionsDiv);
    }

    chatArea.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();
  }

  /**
   * End screening and show results
   */
  function finishScreening() {
    isChatFinished = true;

    // Show completion message
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-wrapper nova';
    msgDiv.style.opacity = '0';
    msgDiv.style.animation = 'fadeIn 0.5s ease forwards';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble nova-bubble';
    bubble.innerHTML = completionMessage;
    msgDiv.appendChild(bubble);
    chatArea.insertBefore(msgDiv, typingIndicator);

    // Get final results
    const results = screeningEngine.getFinalResults();
    const recognition = screeningEngine.getRecognitionMoment();

    // Save scores for results page
    localStorage.setItem('neurobloom_scores', JSON.stringify({
      masking: Math.round(results.masking),
      executive: Math.round(results.executive),
      sensory: Math.round(results.sensory)
    }));
    localStorage.setItem('neurobloom_recognition', JSON.stringify(recognition));

    // Show transition to results
    setTimeout(() => {
      const transitionDiv = document.createElement('div');
      transitionDiv.className = 'message-wrapper nova';
      transitionDiv.style.opacity = '0';
      transitionDiv.style.animation = 'fadeIn 0.6s ease forwards';
      const transitionBubble = document.createElement('div');
      transitionBubble.className = 'message-bubble nova-bubble';
      transitionBubble.innerHTML = `<strong>${recognition.title}</strong><br><br>${recognition.message}`;
      transitionDiv.appendChild(transitionBubble);
      
      const ctaDiv = document.createElement('div');
      ctaDiv.style.marginTop = '20px';
      ctaDiv.style.opacity = '0';
      ctaDiv.style.animation = 'fadeIn 0.6s ease forwards 0.3s';
      const ctaBtn = document.createElement('button');
      ctaBtn.className = 'nova-option-btn nova-cta';
      ctaBtn.textContent = 'See Your Full Pattern →';
      ctaBtn.onclick = () => {
        window.location.href = 'results.html';
      };
      ctaDiv.appendChild(ctaBtn);
      transitionDiv.appendChild(ctaDiv);
      
      chatArea.insertBefore(transitionDiv, typingIndicator);
      scrollToBottom();
    }, 1200);
  }

  // Start with intro question
  setTimeout(() => {
    const intro = screeningEngine.getStartingQuestion();
    showNovaMessage({
      text: intro.text,
      options: intro.options
    });
  }, 500); 
        { label: "No", score: 0 }
      ]
    });
  }

  function showFinalResult() {
    localStorage.setItem('neurobloom_scores', JSON.stringify(userScores));
    
    // final status uses standard text
    showNovaMessage({ text: completionMessage }, true, 1500, () => {
      setTimeout(() => {
        window.location.href = '/results.html';
      }, 2000);
    });
  }

  function showNovaMessage(content, isFinal = false, customDelay = null, callback = null) {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();

    const delay = customDelay !== null ? customDelay : Math.floor(Math.random() * 500) + 1200;
    
    setTimeout(() => {
      typingIndicator.classList.add('hidden');

      const novaDiv = document.createElement('div');
      novaDiv.className = 'message-wrapper nova';
      novaDiv.style.opacity = '0';
      novaDiv.style.animation = 'fadeIn 1s ease forwards';
      
      let text = typeof content === 'string' ? content : content.text;
      
      novaDiv.innerHTML = `
        <div class="message-bubble nova-bubble">
          ${text}
        </div>
      `;

      if (content.options) {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quick-prompts';
        optionsDiv.style.marginTop = '8px';
        optionsDiv.style.marginLeft = '40px'; 
        optionsDiv.style.animation = 'fadeIn 1s 0.5s ease backwards';

        content.options.forEach(optObj => {
          const btn = document.createElement('button');
          btn.className = 'prompt-chip';
          btn.textContent = optObj.label;
          btn.addEventListener('click', () => {
             optionsDiv.querySelectorAll('button').forEach(b => {
                 b.disabled = true;
                 b.style.pointerEvents = 'none';
                 if (b !== btn) b.style.opacity = '0.4';
             });
             btn.style.background = 'var(--rose)';
             btn.style.color = 'white';
             btn.style.borderColor = 'var(--rose)';

             processUserChoice(optObj.label, optObj);
          });
          optionsDiv.appendChild(btn);
        });
        novaDiv.appendChild(optionsDiv);
      }

      chatArea.insertBefore(novaDiv, typingIndicator);
      scrollToBottom();
      
      // We manually override placeholder text
      chatInput.placeholder = isFinal ? "Conversation paused. Nova is listening." : "Please select an option above...";
      
      if (callback) callback();
    }, delay);
  }

  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[tag] || tag)
    );
  }
});
