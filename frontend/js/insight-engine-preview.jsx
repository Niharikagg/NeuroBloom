import { createRoot } from 'react-dom/client';
import InsightEngine from '../../src/components/InsightEngine.jsx';

const screeningData = {
  userId: 'demo_user',
  answers: [
    {
      question: 'Do you feel exhausted after social situations even when they go well?',
      answer: 'Yes. I can look fine in the moment but I crash afterwards and need hours alone.'
    },
    {
      question: 'What usually feels hardest when you are overwhelmed?',
      answer: 'Noise, bright spaces, and trying to keep acting normal when I am already overloaded.'
    },
    {
      question: 'What happens with tasks when your brain is full?',
      answer: 'I freeze, avoid opening things, and then feel guilty for not starting.'
    }
  ],
  maskingScore: 74,
  dominantTraits: ['sensory sensitivity', 'masking', 'focus'],
  timestamp: new Date().toISOString()
};

const demoApiService = {
  async generateInsightReport(data) {
    const mentionsSensory = Array.isArray(data.dominantTraits) && data.dominantTraits.includes('sensory sensitivity');
    const highMasking = typeof data.maskingScore === 'number' && data.maskingScore > 60;

    return {
      success: true,
      data: {
        headline: highMasking
          ? 'You have been working very hard to look okay.'
          : 'Your nervous system is carrying more than it shows.',
        opening: 'Your answers read like someone who is constantly translating herself for the world around her. You are not only managing tasks and stimulation, you are also managing how visible your effort looks to everyone else.',
        patterns: [
          {
            title: 'Performing steadiness',
            insight: 'You seem used to holding yourself together in real time, even after your body has already started asking for relief. That can make other people miss how expensive ordinary moments are for you.',
            reframe: 'Needing recovery after performing normalcy is not overreacting. It is information.'
          },
          {
            title: 'Sensory spillover',
            insight: mentionsSensory
              ? 'Noise and busy environments do not stay external for you; they become part of your cognitive load. By the time you try to do the actual task, your bandwidth is already partly gone.'
              : 'Your environment appears to influence your functioning more than other people may realise. That makes task initiation harder before the task even begins.',
            reframe: 'Sensitivity is not fragility. It is a real cost your system is paying attention to.'
          },
          {
            title: 'Freeze before starting',
            insight: 'When too many demands pile up, your brain seems to switch from intention into shutdown. That can look like avoidance from the outside, but your answers suggest it feels more like gridlock than choice.',
            reframe: 'Stuck is not laziness. It is what overload can look like when it lands in executive function.'
          }
        ],
        energyCost: 'This combination can make everyday life feel oddly expensive. You are spending energy on sensory filtering, task initiation, and the hidden labor of appearing composed all at once.',
        closingMessage: 'Nothing in this report says you are failing. It says your effort has been real for a long time, even when other people could not see it.',
        importantNote: 'This is a self-awareness tool, not a clinical assessment. Please speak with a professional for any diagnosis.'
      }
    };
  }
};

function handleLog(session) {
  console.log('Insight saved', session);
}

function handleComplete() {
  console.log('Insight reflection complete');
}

const root = createRoot(document.getElementById('app'));
root.render(
  <InsightEngine
    screeningData={screeningData}
    onComplete={handleComplete}
    onLog={handleLog}
    apiService={demoApiService}
  />
);
