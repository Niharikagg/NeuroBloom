document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  const resultsArea = document.getElementById('resultsArea');
  const resultsInput = document.getElementById('resultsInput');

  // Load scores saved by nova.js
  const savedScores = localStorage.getItem('neurobloom_scores');
  let scores = { masking: 0, sensory_overload: 0, social_understanding: 0, inner_focus: 0 };
  if (savedScores) {
    scores = JSON.parse(savedScores);
  }

  // Maximum possible scores per category: (number of questions × 4)
  // Masking:              7 questions × 4 = 28
  // Sensory Overload:     3 questions × 4 = 12
  // Social Understanding: 3 questions × 4 = 12
  // Inner Focus:          2 questions × 4 = 8
  const MAX = {
    masking: 28,
    sensory_overload: 12,
    social_understanding: 12,
    inner_focus: 8
  };

  // Calculate percentages using the formula:
  // (points earned / max possible) × 100
  const percentages = {
    masking:              Math.min(Math.round((scores.masking / MAX.masking) * 100), 100),
    sensory_overload:     Math.min(Math.round((scores.sensory_overload / MAX.sensory_overload) * 100), 100),
    social_understanding: Math.min(Math.round((scores.social_understanding / MAX.social_understanding) * 100), 100),
    inner_focus:          Math.min(Math.round((scores.inner_focus / MAX.inner_focus) * 100), 100)
  };

  // Determine primary pattern: sort all categories by percentage descending
  const sorted = [
    { cat: 'masking',              val: percentages.masking },
    { cat: 'sensory_overload',     val: percentages.sensory_overload },
    { cat: 'social_understanding', val: percentages.social_understanding },
    { cat: 'inner_focus',          val: percentages.inner_focus }
  ].sort((a, b) => b.val - a.val);

  let highestCat = sorted[0].cat;

  // Mixed result: if top two are within 10 percentage points of each other
  if (sorted[0].val - sorted[1].val <= 10) {
    highestCat = 'mixed';
  }

  // Pattern labels and Nova insights per category
  const resultsData = {
    masking: {
      label: "The Exhausted Performer",
      insight: "Most of your energy seems to go into looking fine while quietly holding a lot together. That kind of constant performance can make even ordinary days feel expensive — especially when the sensory and social layers are also asking for attention underneath it all. This isn't a personality flaw; it's a resource problem. Your brain is spending more on survival mode than it should have to.<br><br>What part of the day usually leaves you the most drained?"
    },
    sensory_overload: {
      label: "The Overstimulated Achiever",
      insight: "Your nervous system is absorbing a lot more than most people around you realize — noise, light, tone of voice, the energy in a room. By the time you get to the actual tasks, you're often already halfway depleted. The achieving part is real, but it's costing you more than it looks like from the outside.<br><br>What environment do you do your best thinking in?"
    },
    social_understanding: {
      label: "The Social Decoder",
      insight: "A significant amount of your energy goes into reading situations, decoding what people mean, and figuring out how to respond in a way that feels right. It's not that you don't care — it's that you're working harder than most people do just to navigate the same moment. That gap is exhausting, and it's real.<br><br>Which social situations feel the most confusing or draining?"
    },
    inner_focus: {
      label: "The Deep Diver",
      insight: "Your brain tends to go all the way in — whether that's an interest, an idea, or a way of seeing the world differently. That depth is a real strength, even if it's sometimes made you feel out of step with people who move on faster. The way you engage is unusual, but it's not something that needs fixing.<br><br>What's something you've gone really deep on that most people wouldn't expect?"
    },
    mixed: {
      label: "The Mixed-Load Navigator",
      insight: "Your patterns don't land in just one category — your brain is managing a complex mix of masking, sensory filtering, social decoding, and deep focus all at once. That means your energy gets pulled in multiple directions, and burnout can sneak up quietly. You aren't dealing with one challenge; you're carrying an intersecting load.<br><br>Which of these areas feels the heaviest for you right now?"
    }
  };

  // Inject pattern label and Nova's insight
  document.getElementById('patternLabel').textContent = resultsData[highestCat].label;
  document.getElementById('insightText').innerHTML = resultsData[highestCat].insight;

  // Animate score bars
  document.getElementById('barMasking').style.width              = percentages.masking + '%';
  document.getElementById('numMasking').textContent              = percentages.masking + '%';
  document.getElementById('barSensoryOverload').style.width      = percentages.sensory_overload + '%';
  document.getElementById('numSensoryOverload').textContent      = percentages.sensory_overload + '%';
  document.getElementById('barSocialUnderstanding').style.width  = percentages.social_understanding + '%';
  document.getElementById('numSocialUnderstanding').textContent  = percentages.social_understanding + '%';
  document.getElementById('barInnerFocus').style.width           = percentages.inner_focus + '%';
  document.getElementById('numInnerFocus').textContent           = percentages.inner_focus + '%';

  // Simulate Nova "synthesizing" loading delay, then reveal results
  setTimeout(() => {
    loadingState.classList.add('fade-out');

    setTimeout(() => {
      loadingState.style.display = 'none';
      resultsArea.classList.remove('hidden');
      resultsInput.classList.remove('hidden');
    }, 1200);

  }, 4000);
});
