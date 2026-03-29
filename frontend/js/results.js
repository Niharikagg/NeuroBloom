document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  const resultsArea = document.getElementById('resultsArea');
  const resultsInput = document.getElementById('resultsInput');

  // Load scores
  const savedScores = localStorage.getItem('neurobloom_scores');
  let scores = { masking: 0, executive: 0, sensory: 0 };
  if (savedScores) {
    scores = JSON.parse(savedScores);
  }

  // Maximum possible scores (base + followUp max = doubled matrix)
  const MAX_MASKING = 14.50;
  const MAX_EXECUTIVE = 15.00;
  const MAX_SENSORY = 14.50;

  // Calculate percentages 
  const percentages = {
    masking: Math.min(Math.round((scores.masking / MAX_MASKING) * 100), 100),
    executive: Math.min(Math.round((scores.executive / MAX_EXECUTIVE) * 100), 100),
    sensory: Math.min(Math.round((scores.sensory / MAX_SENSORY) * 100), 100)
  };

  // Determine highest pattern
  const sorted = [
    { cat: 'masking', val: percentages.masking },
    { cat: 'executive', val: percentages.executive },
    { cat: 'sensory', val: percentages.sensory }
  ].sort((a, b) => b.val - a.val);

  let highestCat = sorted[0].cat;
  
  // Rule: If two or more are close together, use "The Mixed-Load Navigator"
  if (sorted[0].val - sorted[1].val <= 8) {
    highestCat = 'mixed';
  }

  const resultsData = {
    masking: {
      label: "The Exhausted Performer",
      insight: "Most of your energy seems to go into looking okay while trying not to fall apart. That kind of constant performance can make even ordinary days feel expensive, especially when sensory overload and task-starting also keep asking for attention. This is not a personality flaw — it is your brain spending too much energy on survival mode.<br><br>What part of the day usually leaves you most drained?"
    },
    executive: {
      label: "The Stuck Starter",
      insight: "You seem to know what needs doing, but starting it is where everything gets weirdly heavy. That’s usually less about laziness and more about executive friction showing up at the worst possible time. The other scores suggest there’s some pressure in the background too, but the starting problem is the loudest one here.<br><br>What kind of task do you usually get stuck on first?"
    },
    sensory: {
      label: "The Overstimulated Achiever",
      insight: "Your nervous system is absorbing a lot more than most people realize — noise, light, tone of voice, the energy in a room. By the time you get to actual work, you're already halfway depleted. The achieving part is real, but it's costing you more than it should.<br><br>What environment do you do your best thinking in?"
    },
    mixed: {
      label: "The Mixed-Load Navigator",
      insight: "Your brain is managing a complex intersection of needs — balancing effort across masking, executive planning, and sensory filtering simultaneously. This means your energy gets drained from multiple directions at once, making burnout harder to predict. You aren't just dealing with one challenge; you're carrying a mixed load.<br><br>Which of these areas feels the most exhausting right now?"
    }
  };

  // Inject UI Content based on outcome
  document.getElementById('patternLabel').textContent = resultsData[highestCat].label;
  document.getElementById('insightText').innerHTML = resultsData[highestCat].insight;

  document.getElementById('barMasking').style.width = percentages.masking + '%';
  document.getElementById('numMasking').textContent = percentages.masking + '%';
  document.getElementById('barExecutive').style.width = percentages.executive + '%';
  document.getElementById('numExecutive').textContent = percentages.executive + '%';
  document.getElementById('barSensory').style.width = percentages.sensory + '%';
  document.getElementById('numSensory').textContent = percentages.sensory + '%';

  // Simulate loading delay
  setTimeout(() => {
    loadingState.classList.add('fade-out');
    
    setTimeout(() => {
      loadingState.style.display = 'none';
      resultsArea.classList.remove('hidden');
      resultsInput.classList.remove('hidden');
    }, 1200); 
    
  }, 4000);
});
