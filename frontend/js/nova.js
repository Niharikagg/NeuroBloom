document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatArea = document.getElementById('chatArea');
  const quickPrompts = document.getElementById('quickPrompts');
  const typingIndicator = document.getElementById('typingIndicator');


  const questions = [
    { text: "As a child, I engaged in imaginative or 'fantasy-world' play differently than others my age.", category: "inner_focus" },
    { text: "Sounds, lights, textures, smells, or tastes often feel overwhelming or calming to me.", category: "sensory_overload" },
    { text: "I often feel emotionally or physically drained after socializing, even with people I like.", category: "sensory_overload" },
    { text: "I sometimes struggle to know what to say or feel confused about social cues in conversations.", category: "social_understanding" },
    { text: "I have strong, long-lasting, and unusually focused interests that I dive deep into.", category: "inner_focus" },
    { text: "I find myself copying others' body language, facial expressions, or speech to fit in better.", category: "masking" },
    { text: "I consciously rehearse how to look or act before going into social situations.", category: "masking" },
    { text: "I sometimes use scripts or prepared topic lists in my head during conversations.", category: "masking" },
    { text: "I often feel like I am 'performing' or 'masking' my true self in social settings.", category: "masking" },
    { text: "I have spent time studying social rules or behavior to understand how to act 'normally'.", category: "masking" },
    { text: "I find myself constantly monitoring my own facial expressions or body language while talking.", category: "masking" },
    { text: "I prefer one-on-one or small-group settings over big, noisy, or crowded groups.", category: "sensory_overload" },
    { text: "I find friendships can be intense or draining, sometimes swinging between closeness and withdrawal.", category: "social_understanding" },
    { text: "I have often felt 'different' from others or been called 'too sensitive,' 'weird,' or 'shy.'", category: "social_understanding" },
    { text: "I frequently hide or deny my own needs to avoid drawing attention or seeming 'difficult'.", category: "masking" }
  ];

  const acknowledgments = [
    "I hear you.",
    "That makes a lot of sense.",
    "Thank you for sharing that.",
    "Got it.",
    "I understand."
  ];
  
  const completionMessage = "Thank you. I've got enough to put your pattern together now.";

  let currentQuestionIndex = -1; // -1 = initial greeting
  let isChatFinished = false;

  let userScores = { masking: 0, sensory_overload: 0, social_understanding: 0, inner_focus: 0 };

  // Initial chips listener
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      processUserChoice(chip.textContent, null);
    });
  });

  // Since text input is disabled, we process clicks directly
  function processUserChoice(text, optionScoreObj) {
    if (isChatFinished) return;

    if (currentQuestionIndex === -1 && quickPrompts) {
      quickPrompts.style.transition = 'opacity 0.5s ease';
      quickPrompts.style.opacity = '0';
      setTimeout(() => quickPrompts.remove(), 500);
    }

    // append user bubble
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-wrapper user';
    msgDiv.style.opacity = '0';
    msgDiv.style.animation = 'fadeIn 0.4s ease forwards';
    msgDiv.innerHTML = `<div class="message-bubble user-bubble">${escapeHTML(text)}</div>`;
    chatArea.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();

    // Greeting handled
    if (currentQuestionIndex === -1) {
      currentQuestionIndex++;
      askNextMainQuestion();
      return;
    }

    const q = questions[currentQuestionIndex];

    // Choice logic based on user's new 5-point scale
    if (optionScoreObj !== null) {
      userScores[q.category] += optionScoreObj.score;
    }

    moveToNextQuestion();
  }

  function moveToNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      askNextMainQuestion();
    } else {
      isChatFinished = true;
      showFinalResult();
    }
  }

  function askNextMainQuestion() {
    const q = questions[currentQuestionIndex];
    let responseText = "";
    
    // Add organic ack string to bubble
    if (currentQuestionIndex === 0) {
      responseText = q.text;
    } else {
      const ack = acknowledgments[currentQuestionIndex % acknowledgments.length];
      responseText = ack + "<br><br>" + q.text;
    }

    // New 5-point scale options as requested by USER
    showNovaMessage({ 
      text: responseText, 
      options: [
        { label: "Strongly Agree", score: 4 },
        { label: "Agree", score: 3 }, 
        { label: "Neutral / Unsure", score: 2 }, 
        { label: "Disagree", score: 1 },
        { label: "Strongly Disagree", score: 0 }
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
