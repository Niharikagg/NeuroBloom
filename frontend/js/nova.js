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

  const questions = [
    { 
      text: "Do you often seem fine on the outside while feeling drained inside?", 
      weights: { masking: 1.0, executive: 0.25, sensory: 0.25 },
      followUp: {
        text: "What part feels most tiring — acting fine, staying alert, or both?",
        options: [{ label: "Acting fine", score: 0.5 }, { label: "Staying alert", score: 0.5 }, { label: "Both", score: 1.0 }]
      }
    },
    { 
      text: "Do you copy how other people act so you can fit in more easily?", 
      weights: { masking: 1.0, executive: 0.25, sensory: 0.25 },
      followUp: {
        text: "When do you notice yourself doing that the most?",
        options: [{ label: "At work/school", score: 0.5 }, { label: "With new people", score: 0.5 }, { label: "Almost everywhere", score: 1.0 }]
      }
    },
    { 
      text: "Do you rehearse what you will say before talking to people?", 
      weights: { masking: 1.0, executive: 0.25, sensory: 0.25 },
      followUp: {
         text: "What kinds of conversations make you do that most?",
         options: [{ label: "Important ones", score: 0.5 }, { label: "Small talk", score: 0.5 }, { label: "All of them", score: 1.0 }]
      }
    },
    { 
      text: "Do you leave social situations feeling like you were performing?", 
      weights: { masking: 1.0, executive: 0.25, sensory: 0.25 },
      followUp: {
         text: "What part of the interaction feels most draining?",
         options: [{ label: "Thinking of what to say", score: 0.5 }, { label: "Hiding my real state", score: 1.0 }, { label: "The sensory environment", score: 0.5 }]
      }
    },
    { 
      text: "Do you hide when you are struggling until it becomes too much?", 
      weights: { masking: 1.0, executive: 0.25, sensory: 0.25 },
      followUp: {
         text: "What usually stops you from saying it earlier?",
         options: [{ label: "People don't understand", score: 1.0 }, { label: "I don't want to be a burden", score: 0.5 }, { label: "I don't realize I'm struggling yet", score: 0.5 }]
      }
    },
    { 
      text: "Do you know what needs to be done but still struggle to start?", 
      weights: { masking: 0.2, executive: 1.0, sensory: 0.2 },
      followUp: {
         text: "What kind of task gets stuck the fastest?",
         options: [{ label: "Multi-step tasks", score: 1.0 }, { label: "Boring/routine tasks", score: 0.5 }, { label: "Important/stressful ones", score: 0.5 }]
      }
    },
    { 
      text: "Do small tasks feel bigger than they should?", 
      weights: { masking: 0.2, executive: 1.0, sensory: 0.2 },
      followUp: {
         text: "Which kinds of tasks feel surprisingly heavy?",
         options: [{ label: "Emails / admin", score: 0.5 }, { label: "Chores", score: 0.5 }, { label: "Almost everything lately", score: 1.0 }]
      }
    },
    { 
      text: "Do you lose track of time even when you are trying to stay on schedule?", 
      weights: { masking: 0.2, executive: 1.0, sensory: 0.2 },
      followUp: {
         text: "When does that happen most often?",
         options: [{ label: "When I'm hyperfocused", score: 1.0 }, { label: "When transitioning tasks", score: 0.5 }, { label: "When distracted", score: 0.5 }]
      }
    },
    { 
      text: "Do you often forget steps in the middle of doing something?", 
      weights: { masking: 0.2, executive: 1.0, sensory: 0.2 },
      followUp: {
         text: "Is there a type of task where that happens more?",
         options: [{ label: "Complex routines", score: 1.0 }, { label: "When I'm interrupted", score: 0.5 }, { label: "Even simple things", score: 1.0 }]
      }
    },
    { 
      text: "Do you feel overwhelmed when you have to plan many things at once?", 
      weights: { masking: 0.2, executive: 1.0, sensory: 0.2 },
      followUp: {
         text: "What part of planning feels hardest?",
         options: [{ label: "Deciding priorities", score: 0.5 }, { label: "Organizing the steps", score: 0.5 }, { label: "Actually starting", score: 1.0 }]
      }
    },
    { 
      text: "Do noisy, crowded, or bright places drain you quickly?", 
      weights: { masking: 0.25, executive: 0.25, sensory: 1.0 },
      followUp: {
         text: "Which of those tends to affect you the most?",
         options: [{ label: "Loud noise", score: 1.0 }, { label: "Bright lights", score: 0.5 }, { label: "Lots of people moving", score: 0.5 }]
      }
    },
    { 
      text: "Do certain fabrics, smells, or sounds bother you more than other people?", 
      weights: { masking: 0.25, executive: 0.25, sensory: 1.0 },
      followUp: {
         text: "Which one usually gets to you first?",
         options: [{ label: "Textures/Fabrics", score: 1.0 }, { label: "Sounds", score: 1.0 }, { label: "Smells", score: 0.5 }]
      }
    },
    { 
      text: "Do you need quiet or alone time after being in a busy place?", 
      weights: { masking: 0.25, executive: 0.25, sensory: 1.0 },
      followUp: {
         text: "How long does it usually take to feel okay again?",
         options: [{ label: "An hour or two", score: 0.5 }, { label: "The rest of the day", score: 1.0 }, { label: "Multiple days", score: 1.0 }]
      }
    },
    { 
      text: "Do too many sights, sounds, or people make it hard to think clearly?", 
      weights: { masking: 0.25, executive: 0.25, sensory: 1.0 },
      followUp: {
         text: "What kind of environment helps your brain settle?",
         options: [{ label: "Dark and silent", score: 1.0 }, { label: "Soft lighting/music", score: 0.5 }, { label: "Nature/outdoors", score: 0.5 }]
      }
    },
    { 
      text: "After a normal day, do you sometimes feel like you need a long recovery just to function again?", 
      weights: { masking: 0.25, executive: 0.25, sensory: 1.0 },
      followUp: {
         text: "What usually helps you recover fastest?",
         options: [{ label: "Sleep/Rest", score: 0.5 }, { label: "Isolating from people", score: 1.0 }, { label: "Hobbies", score: 0.5 }]
      }
    }
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
  let inFollowUp = false;
  let isChatFinished = false;

  let userScores = { masking: 0, executive: 0, sensory: 0 };

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

    if (!inFollowUp) {
      // Option is from MAIN question (yes/sometimes/no)
      let multiplier = 0;
      if (text === "Yes") multiplier = 1.0;
      if (text === "Sometimes") multiplier = 0.5;

      if (multiplier > 0) {
        userScores.masking += q.weights.masking * multiplier;
        userScores.executive += q.weights.executive * multiplier;
        userScores.sensory += q.weights.sensory * multiplier;
        
        // Trigger followUp
        inFollowUp = true;
        showNovaMessage({
           text: q.followUp.text,
           options: q.followUp.options
        });
      } else {
        // No followUp if they push "No"
        moveToNextQuestion();
      }
    } else {
      // Option is from FOLLOW UP
      // we add the provided score matching the matrix modifiers
      if (optionScoreObj && optionScoreObj.score > 0) {
        userScores.masking += q.weights.masking * optionScoreObj.score;
        userScores.executive += q.weights.executive * optionScoreObj.score;
        userScores.sensory += q.weights.sensory * optionScoreObj.score;
      }
      inFollowUp = false;
      moveToNextQuestion();
    }
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

    // Standard yes/no/sometimes options for the main question branch
    showNovaMessage({ 
      text: responseText, 
      options: [
        { label: "Yes", score: 1 }, 
        { label: "Sometimes", score: 0.5 }, 
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
