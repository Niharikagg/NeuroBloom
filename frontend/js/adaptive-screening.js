/**
 * ADAPTIVE SCREENING ENGINE
 * 
 * Creates a conversational, empathetic questionnaire that:
 * - Starts with masking patterns (the relatable entry point)
 * - Adapts in real-time based on responses
 * - Goes deeper into threads that resonate with the user
 * - Feels like a conversation, not a form
 */

class AdaptiveScreeningEngine {
  constructor() {
    // Track user journey
    this.userResponses = [];
    this.categories = {
      masking: { score: 0, responses: [], depth: 0 },
      executive: { score: 0, responses: [], depth: 0 },
      sensory: { score: 0, responses: [], depth: 0 }
    };

    // Question pool organized by category and depth
    this.questionTree = this.initializeQuestionTree();
    this.currentPath = [];
  }

  initializeQuestionTree() {
    return {
      // ENTRY THREAD: Masking (the "finally someone gets me" moment)
      masking: {
        depth0: [
          {
            id: 'm1',
            text: "Do you find yourself doing everything perfectly on the outside but feeling completely exhausted inside?",
            empathetic: true,
            followUps: {
              yes: [
                { text: "What part of that exhaustion feels most real to you?", options: [
                  { label: "I'm hiding my true self all day", score: 1.0, next: 'm1-deep' },
                  { label: "The effort to seem fine is draining", score: 0.8, next: 'm1-effort' },
                  { label: "By evening I have nothing left", score: 0.7, next: 'm1-collapse' }
                ] }
              ],
              sometimes: [
                { text: "When does that split between inside and outside show up most?", options: [
                  { label: "At work or in social situations", score: 0.6, next: 'm1-context' },
                  { label: "When I'm around certain people", score: 0.5, next: 'm1-people' }
                ] }
              ],
              no: null
            }
          },
          {
            id: 'm2',
            text: "Do people often say you're 'too sensitive' or 'too emotional,' when inside you feel like you're barely holding anything in?",
            empathetic: true,
            followUps: {
              yes: [
                { text: "Does that feel like they're seeing you wrong, or like you're secretly struggling more than they know?", options: [
                  { label: "They don't see how much I'm managing", score: 1.0, next: 'm2-invisible' },
                  { label: "I actually am struggling more than I show", score: 0.9, next: 'm2-hidden' },
                  { label: "I feel too much but manage it perfectly", score: 0.8, next: 'm2-contained' }
                ] }
              ],
              sometimes: [
                { text: "In what moments does that happen?", options: [
                  { label: "When I finally admit something's wrong", score: 0.7, next: 'm2-admission' },
                  { label: "When my mask slips unexpectedly", score: 0.8, next: 'm2-slip' }
                ] }
              ],
              no: null
            }
          },
          {
            id: 'm3',
            text: "Do you rehearse conversations in your head before they happen, or have 'scripts' ready for social situations?",
            empathetic: true,
            followUps: {
              yes: [
                { text: "Is that planning helping you feel safer, or does it feel like a burden you have to carry?", options: [
                  { label: "It keeps me from messing up", score: 0.6, next: 'm3-safety' },
                  { label: "It's exhausting but necessary", score: 0.9, next: 'm3-necessity' },
                  { label: "I feel like I'm performing, not connecting", score: 1.0, next: 'm3-performance' }
                ] }
              ],
              sometimes: [
                { text: "What kind of conversations trigger that the most?", options: [
                  { label: "Anything important or emotional", score: 0.7, next: 'm3-important' },
                  { label: "Small talk feels harder than deep conversations", score: 0.6, next: 'm3-smalltalk' },
                  { label: "Almost all of them", score: 0.9, next: 'm3-constant' }
                ] }
              ],
              no: null
            }
          }
        ],
        // Deep threads that explore specific masking patterns
        'm1-deep': {
          id: 'm1-deep',
          text: "When you hide your true self, what feels most important to protect — your thoughts, your emotions, your real needs, or something else?",
          followUps: {
            yes: [
              { text: "How long have you been doing that?", options: [
                { label: "As long as I can remember", score: 1.0 },
                { label: "Since childhood/school", score: 0.9 },
                { label: "In certain environments", score: 0.7 }
              ] }
            ]
          }
        },
        'm1-effort': {
          id: 'm1-effort',
          text: "Does that effort to seem fine ever make you feel numb, or like you're on autopilot?",
          followUps: {
            yes: [
              { text: "When does that autopilot kick in most?", options: [
                { label: "During the day, then I crash at night", score: 0.9 },
                { label: "In group settings", score: 0.7 },
                { label: "When I feel anxious or unsafe", score: 0.8 }
              ] }
            ]
          }
        },
        'm1-collapse': {
          id: 'm1-collapse',
          text: "When you collapse at the end of the day, is it physical tiredness, mental shutdown, or that emotional barrier finally dropping?",
          followUps: {
            yes: [
              { text: "How long does it usually take to recover?", options: [
                { label: "Hours — I need the evening", score: 0.7 },
                { label: "The next day", score: 0.8 },
                { label: "Multiple days if it's been intense", score: 1.0 }
              ] }
            ]
          }
        },
        'm3-performance': {
          id: 'm3-performance',
          text: "Does that performance mode ever make you feel like you're not being known for who you actually are?",
          followUps: {
            yes: [
              { text: "Is that loneliness part of why conversations exhaust you?", options: [
                { label: "Yes, completely", score: 1.0 },
                { label: "It's part of it", score: 0.8 }
              ] }
            ]
          }
        }
      },

      // EXECUTIVE FUNCTION THREAD
      executive: {
        depth0: [
          {
            id: 'e1',
            text: "Do you know exactly what needs to be done but still struggle to actually start it?",
            followUps: {
              yes: [
                { text: "What happens in that gap between knowing and doing?", options: [
                  { label: "My brain just won't cooperate", score: 1.0, next: 'e1-resistance' },
                  { label: "It feels overwhelming even though it's not big", score: 0.8, next: 'e1-weight' },
                  { label: "I get stuck on where to begin", score: 0.7, next: 'e1-stuck' }
                ] }
              ]
            }
          },
          {
            id: 'e2',
            text: "Do small tasks feel surprisingly heavy, like they weigh more than they should?",
            followUps: {
              yes: [
                { text: "Which types of tasks get that heaviness?", options: [
                  { label: "Anything administrative or repetitive", score: 0.8 },
                  { label: "Things that require decisions", score: 0.7 },
                  { label: "Almost everything when I'm already tired", score: 0.9 }
                ] }
              ]
            }
          }
        ],
        'e1-resistance': {
          id: 'e1-resistance',
          text: "When your brain won't cooperate, does it feel like emotional avoidance, or more like something is literally blocking your ability to begin?"
        },
        'e1-weight': {
          id: 'e1-weight',
          text: "Do you think that happens because the actual task is bigger than it looks, or because your brain is already working hard at something invisible?"
        },
        'e1-stuck': {
          id: 'e1-stuck',
          text: "Once you actually start, does the doing part feel easier than the starting?"
        }
      },

      // SENSORY THREAD (branches from masking if user flags it)
      sensory: {
        depth0: [
          {
            id: 's1',
            text: "Do noisy, crowded, or bright places drain you faster than they seem to drain the people around you?",
            followUps: {
              yes: [
                { text: "Which hits you first — the noise, the light, or the number of people?", options: [
                  { label: "Loud noise — it's like a physical assault", score: 1.0 },
                  { label: "Bright lights make my eyes hurt", score: 0.8 },
                  { label: "Too many people moving around me", score: 0.7 }
                ] }
              ]
            }
          },
          {
            id: 's2',
            text: "Do certain textures, fabrics, or seams in clothing bother you more than most people mention?",
            followUps: {
              yes: [
                { text: "How much does that affect what you can wear or do?", options: [
                  { label: "I have to be careful about clothing choices", score: 0.7 },
                  { label: "It can ruin my whole day", score: 0.9 }
                ] }
              ]
            }
          }
        ]
      },

      // COMBINED FATIGUE (bridges all categories)
      fatigue: {
        depth0: [
          {
            id: 'f1',
            text: "After a normal day, do you sometimes need a long recovery — not just sleep, but actual isolation — just to feel like yourself again?"
          }
        ]
      }
    };
  }

  /**
   * Start adaptive screening
   * Returns first question designed for maximum empathy
   */
  getStartingQuestion() {
    return {
      id: 'intro',
      text: "This isn't a test or a diagnosis. This is a conversation about your lived experience. There's no right answer, just what's true for you. Ready?",
      options: [
        { label: "Yes, I'm ready", score: 1 },
        { label: "Take me through it", score: 1 }
      ],
      isIntro: true
    };
  }

  /**
   * Get next question based on user's current path
   * Intelligently routes through adaptive branches
   */
  getNextQuestion(userScore = null, nextId = null) {
    // If explicit next ID provided (from follow-up routing), use it
    if (nextId) {
      return this.findQuestionById(nextId);
    }

    // Otherwise, determine which category to explore next
    // Start with masking (most engaging entry point)
    if (this.categories.masking.depth === 0) {
      const maskingQ = this.questionTree.masking.depth0[
        Math.min(this.userResponses.length, this.questionTree.masking.depth0.length - 1)
      ];
      this.categories.masking.depth++;
      return maskingQ;
    }

    // After masking intro, branch into deeper threads based on responses
    if (this.userResponses.length === 3) {
      // Check which masking threat resonated most
      const strongMaskingResponse = this.userResponses.some(r => r.score >= 0.9);
      
      if (strongMaskingResponse) {
        // Go deeper into masking thread
        const deepThread = this.findDeepMaskingQuestion();
        if (deepThread) return deepThread;
      } else {
        // Branch into executive or sensory
        return this.getExecutiveQuestion();
      }
    }

    // Continue through other categories
    return this.getExecutiveQuestion();
  }

  /**
   * Find a masking question that hasn't been asked yet
   */
  findDeepMaskingQuestion() {
    const deepIds = ['m1-deep', 'm1-effort', 'm1-collapse', 'm3-performance'];
    for (const id of deepIds) {
      if (!this.userResponses.some(r => r.id === id)) {
        return this.findQuestionById(id);
      }
    }
    return null;
  }

  /**
   * Get an executive function question if not already covered
   */
  getExecutiveQuestion() {
    if (this.categories.executive.depth === 0) {
      this.categories.executive.depth++;
      return this.questionTree.executive.depth0[0];
    }
    if (this.categories.executive.depth === 1) {
      this.categories.executive.depth++;
      return this.questionTree.executive.depth0[1];
    }
    return this.getSensoryQuestion();
  }

  /**
   * Get a sensory question
   */
  getSensoryQuestion() {
    if (this.categories.sensory.depth === 0) {
      this.categories.sensory.depth++;
      return this.questionTree.sensory.depth0[0];
    }
    return null;
  }

  /**
   * Utility: find question by ID in the tree
   */
  findQuestionById(id) {
    // Search through all categories and depths
    for (const category of Object.values(this.questionTree)) {
      // Check depth0
      if (category.depth0) {
        const found = category.depth0.find(q => q.id === id);
        if (found) return found;
      }
      // Check other depths
      const question = category[id];
      if (question) return question;
    }
    return null;
  }

  /**
   * Record user response and update scores
   */
  recordResponse(questionId, optionLabel, score, categoryHint = null) {
    this.userResponses.push({
      id: questionId,
      answer: optionLabel,
      score: score,
      timestamp: Date.now()
    });

    // Update category scores (smart detection)
    if (questionId.startsWith('m')) {
      this.categories.masking.score += score;
    } else if (questionId.startsWith('e')) {
      this.categories.executive.score += score;
    } else if (questionId.startsWith('s')) {
      this.categories.sensory.score += score;
    }

    return {
      responseCount: this.userResponses.length,
      scores: { ...this.categories }
    };
  }

  /**
   * Get final results
   */
  getFinalResults() {
    // Normalize scores to 0-100
    const normalize = (score, maxScore = 10) => {
      return Math.min(Math.round((score / maxScore) * 100), 100);
    };

    return {
      masking: normalize(this.categories.masking.score),
      executive: normalize(this.categories.executive.score),
      sensory: normalize(this.categories.sensory.score),
      responseCount: this.userResponses.length,
      recognitionMoment: this.getRecognitionMoment()
    };
  }

  /**
   * Generate personalized "aha" moment based on responses
   */
  getRecognitionMoment() {
    const maskingScore = this.categories.masking.score;
    const deepMaskingResponse = this.userResponses.some(r => 
      ['m1-deep', 'm1-effort', 'm1-collapse', 'm3-performance'].includes(r.id)
    );

    if (maskingScore >= 3 && deepMaskingResponse) {
      return {
        title: "The Invisible Performer",
        message: "You spend significant energy managing how you appear to the world, which means your actual capacity is often invisible to others. That 'finally someone gets me' feeling? That's because most people never see the work behind your appearance.",
        prompt: "What would change if people knew what it actually costs you to seem fine?"
      };
    }

    return {
      title: "Your Pattern",
      message: "Based on what you've shared, here's what stands out about how your brain works.",
      prompt: "What resonates most?"
    };
  }
}

// Export for use in nova.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdaptiveScreeningEngine;
}