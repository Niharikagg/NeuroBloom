import React, { useEffect, useMemo, useRef, useState } from 'react';

const ENTRY_OPTIONS = [
  { key: 'cant_start', label: "I know what to do but can't start" },
  { key: 'no_idea', label: 'I have no idea what to do next' },
  { key: 'lost_it', label: 'I was doing something and lost it' },
  { key: 'overwhelmed', label: 'Everything feels urgent at once' }
];

const TIMER_OPTIONS = [
  { minutes: 2, label: '2 min', helper: 'micro action' },
  { minutes: 5, label: '5 min', helper: 'small task' },
  { minutes: 10, label: '10 min', helper: 'focused block' },
  { minutes: 25, label: '25 min', helper: 'full Pomodoro', locked: true }
];

const PRESENCE_LINES = [
  'Still here with you.',
  "You're doing it.",
  'One thing at a time.',
  'The rest can wait.'
];

const RESET_STEPS = [
  'Drop your shoulders if they are up.',
  'Unclench your jaw.',
  'Put both feet on the floor.',
  'Take one slow breath out.',
  'Look at one steady object near you.'
];

const SCALE_OPTIONS = [
  { label: 'Strongly Agree', score: 4 },
  { label: 'Agree', score: 3 },
  { label: 'Neutral / Unsure', score: 2 },
  { label: 'Disagree', score: 1 },
  { label: 'Strongly Disagree', score: 0 }
];

function normalizeText(value) {
  return String(value || '').trim();
}

function buildSmallestMove(task, path, previousStep = '') {
  const cleanTask = normalizeText(task).toLowerCase();
  const cleanPrevious = normalizeText(previousStep).toLowerCase();

  if (cleanTask.includes('email') || cleanTask.includes('message') || cleanTask.includes('reply')) {
    return 'Open the message you need';
  }

  if (cleanTask.includes('report') || cleanTask.includes('essay') || cleanTask.includes('document') || cleanTask.includes('write')) {
    return 'Open the document';
  }

  if (cleanTask.includes('study') || cleanTask.includes('read')) {
    return 'Read the first line only';
  }

  if (cleanTask.includes('meeting') || cleanTask.includes('call')) {
    return 'Open the meeting link';
  }

  if (cleanTask.includes('clean') || cleanTask.includes('laundry') || cleanTask.includes('kitchen')) {
    return 'Touch the first item';
  }

  if (path === 'lost_it' && cleanPrevious) {
    return 'Look at the last thing you touched';
  }

  return 'Open the thing you need';
}

function buildSmallerOptions(step) {
  const clean = normalizeText(step).toLowerCase();

  if (clean.includes('document') || clean.includes('report') || clean.includes('write')) {
    return [
      'Sit at your desk',
      'Open your laptop',
      'Open the document',
      'Read the first line only'
    ];
  }

  if (clean.includes('message') || clean.includes('email') || clean.includes('reply')) {
    return [
      'Put your phone face down',
      'Open your inbox',
      'Open one message',
      'Read the first line only'
    ];
  }

  return [
    'Sit where you need to be',
    'Put your phone face down',
    'Open the thing you need',
    'Read the first line only'
  ];
}

function buildSupportiveSummary(path) {
  switch (path) {
    case 'cant_start':
      return 'You already know the task. We only need the doorway into it.';
    case 'no_idea':
      return 'We can rebuild the next step gently, without making you hold the whole plan.';
    case 'lost_it':
      return 'We will return to the last known step and pick up from there.';
    case 'overwhelmed':
      return 'First we lower the intensity. Then we come back to one thing only.';
    default:
      return '';
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function FocusRecovery() {
  const [stage, setStage] = useState('entry');
  const [path, setPath] = useState('');
  const [task, setTask] = useState('');
  const [previousStep, setPreviousStep] = useState('');
  const [nextStepHint, setNextStepHint] = useState('');
  const [microStep, setMicroStep] = useState('');
  const [smallerChoices, setSmallerChoices] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [presenceIndex, setPresenceIndex] = useState(0);
  const [didUnlockLongTimer, setDidUnlockLongTimer] = useState(false);
  const [sessionOutcome, setSessionOutcome] = useState('');
  const intervalRef = useRef(null);
  const presenceIntervalRef = useRef(null);

  const availableTimers = useMemo(() => (
    TIMER_OPTIONS.map((option) => option.minutes === 25
      ? { ...option, locked: !didUnlockLongTimer }
      : option)
  ), [didUnlockLongTimer]);

  useEffect(() => {
    setTimeLeft(selectedDuration * 60);
    setIsRunning(false);
  }, [selectedDuration]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (presenceIntervalRef.current) {
        window.clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);
          setStage('win');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    presenceIntervalRef.current = window.setInterval(() => {
      setPresenceIndex((current) => (current + 1) % PRESENCE_LINES.length);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (presenceIntervalRef.current) {
        window.clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    if (presenceIntervalRef.current) {
      window.clearInterval(presenceIntervalRef.current);
    }
  }, []);

  function choosePath(nextPath) {
    setPath(nextPath);
    setSessionOutcome('');
    if (nextPath === 'overwhelmed') {
      setStage('reset');
      return;
    }
    setStage('clarify');
  }

  function finishReset() {
    setStage('clarify');
  }

  function continueFromClarify() {
    const resolvedTask = path === 'no_idea'
      ? nextStepHint || task
      : task;
    const smallestMove = buildSmallestMove(resolvedTask, path, previousStep);
    setMicroStep(smallestMove);
    setSmallerChoices(buildSmallerOptions(smallestMove));
    setSelectedDuration(2);
    setPresenceIndex(0);
    setTimeLeft(120);
    setStage('micro');
  }

  function acceptSmallerChoice(choice) {
    setMicroStep(choice);
    setSmallerChoices(buildSmallerOptions(choice));
  }

  function startTimer() {
    setPresenceIndex(0);
    setTimeLeft(selectedDuration * 60);
    setIsRunning(true);
    setStage('timer');
  }

  function handleNeedBreak() {
    setIsRunning(false);
    setStage('reset');
  }

  function handleNextAction() {
    setDidUnlockLongTimer(true);
    setIsRunning(false);
    setPresenceIndex(0);
    setTimeLeft(120);
    setStage('clarify');
  }

  function handleDoneForNow() {
    setSessionOutcome('You got through one hard moment. That counts.');
    setDidUnlockLongTimer(true);
    setStage('done');
  }

  function resetAll() {
    setStage('entry');
    setPath('');
    setTask('');
    setPreviousStep('');
    setNextStepHint('');
    setMicroStep('');
    setSmallerChoices([]);
    setSelectedDuration(2);
    setTimeLeft(120);
    setIsRunning(false);
    setPresenceIndex(0);
    setSessionOutcome('');
  }

  const styles = {
    shell: {
      width: '100%',
      maxWidth: '760px',
      margin: '0 auto',
      padding: '24px 18px 48px',
      boxSizing: 'border-box',
      fontFamily: "'Lexend', sans-serif",
      color: 'var(--deep, #3B2535)'
    },
    card: {
      width: '100%',
      background: 'rgba(255, 255, 255, 0.84)',
      border: '1px solid rgba(188, 160, 188, 0.16)',
      borderRadius: '26px',
      padding: '28px',
      boxSizing: 'border-box',
      boxShadow: '0 14px 38px rgba(59, 37, 53, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    },
    eyebrow: {
      margin: 0,
      fontSize: '0.76rem',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#8B6B7A'
    },
    title: {
      margin: 0,
      fontSize: '2rem',
      lineHeight: 1.15,
      fontWeight: 600,
      color: 'var(--deep, #3B2535)'
    },
    body: {
      margin: 0,
      fontSize: '0.98rem',
      lineHeight: 1.7,
      color: '#5D4A57'
    },
    optionColumn: {
      display: 'grid',
      gap: '12px'
    },
    optionButton: {
      width: '100%',
      border: '1px solid rgba(188, 160, 188, 0.22)',
      borderRadius: '18px',
      background: 'rgba(253, 250, 248, 0.96)',
      padding: '16px 18px',
      textAlign: 'left',
      fontFamily: "'Lexend', sans-serif",
      fontSize: '0.95rem',
      lineHeight: 1.5,
      color: '#4F3B48',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    fieldLabel: {
      margin: 0,
      fontSize: '0.82rem',
      fontWeight: 600,
      color: '#8B6B7A'
    },
    input: {
      width: '100%',
      border: '1px solid rgba(188, 160, 188, 0.22)',
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.9)',
      padding: '14px 16px',
      fontFamily: "'Lexend', sans-serif",
      fontSize: '0.96rem',
      lineHeight: 1.5,
      boxSizing: 'border-box',
      outline: 'none',
      color: '#3B2535'
    },
    helperBox: {
      padding: '16px 18px',
      borderRadius: '18px',
      background: 'rgba(201, 115, 106, 0.08)',
      border: '1px solid rgba(201, 115, 106, 0.15)'
    },
    primaryButton: {
      border: 'none',
      borderRadius: '999px',
      background: 'var(--rose, #C9736A)',
      color: '#fff',
      padding: '14px 20px',
      fontFamily: "'Lexend', sans-serif",
      fontSize: '0.94rem',
      fontWeight: 600,
      cursor: 'pointer',
      alignSelf: 'flex-start'
    },
    secondaryButton: {
      border: '1px solid rgba(188, 160, 188, 0.24)',
      borderRadius: '999px',
      background: 'transparent',
      color: '#5D4A57',
      padding: '14px 20px',
      fontFamily: "'Lexend', sans-serif",
      fontSize: '0.94rem',
      fontWeight: 600,
      cursor: 'pointer'
    },
    buttonRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px'
    },
    singleTaskBox: {
      border: '1px solid rgba(188, 160, 188, 0.16)',
      borderRadius: '22px',
      background: 'rgba(253, 250, 248, 0.96)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    actionText: {
      margin: 0,
      fontSize: '1.7rem',
      lineHeight: 1.2,
      fontWeight: 600,
      color: '#3B2535'
    },
    timerWrap: {
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '22px',
      alignItems: 'center',
      textAlign: 'center',
      padding: '40px 24px',
      background: 'rgba(255,255,255,0.82)',
      borderRadius: '28px',
      border: '1px solid rgba(188, 160, 188, 0.14)',
      boxSizing: 'border-box'
    },
    timerStep: {
      margin: 0,
      fontSize: '2.4rem',
      lineHeight: 1.12,
      fontWeight: 600,
      maxWidth: '15ch'
    },
    timerText: {
      margin: 0,
      fontSize: '4rem',
      lineHeight: 1,
      fontWeight: 500
    },
    timerBar: {
      width: '100%',
      maxWidth: '320px',
      height: '10px',
      borderRadius: '999px',
      background: 'rgba(188, 160, 188, 0.18)',
      overflow: 'hidden'
    },
    timerFill: {
      height: '100%',
      background: 'var(--rose, #C9736A)',
      borderRadius: '999px',
      transition: 'width 1s linear'
    },
    resetList: {
      display: 'grid',
      gap: '10px'
    },
    resetItem: {
      padding: '14px 16px',
      borderRadius: '16px',
      background: 'rgba(253, 250, 248, 0.96)',
      border: '1px solid rgba(188, 160, 188, 0.16)',
      fontSize: '0.94rem',
      lineHeight: 1.5
    }
  };

  const timerProgress = Math.max(0, Math.min(100, ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100));

  return (
    <div style={styles.shell}>
      {stage !== 'timer' && (
        <div style={styles.card}>
          {stage === 'entry' && (
            <>
              <p style={styles.eyebrow}>Focus Recovery</p>
              <h1 style={styles.title}>Get a stalled brain back to one tiny action.</h1>
              <p style={styles.body}>
                This is not a productivity tool. It is a soft scaffold for the moment when you know something needs to happen and your brain will not move.
              </p>
              <div style={styles.optionColumn}>
                {ENTRY_OPTIONS.map((option) => (
                  <button key={option.key} type="button" style={styles.optionButton} onClick={() => choosePath(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {stage === 'reset' && (
            <>
              <p style={styles.eyebrow}>Body Reset</p>
              <h2 style={styles.title}>Nothing to solve yet.</h2>
              <p style={styles.body}>
                When everything feels urgent at once, the first job is to lower the intensity. You only need to move through this one minute gently.
              </p>
              <div style={styles.resetList}>
                {RESET_STEPS.map((step) => (
                  <div key={step} style={styles.resetItem}>{step}</div>
                ))}
              </div>
              <div style={styles.buttonRow}>
                <button type="button" style={styles.primaryButton} onClick={finishReset}>Come back to one task</button>
                <button type="button" style={styles.secondaryButton} onClick={resetAll}>Back</button>
              </div>
            </>
          )}

          {stage === 'clarify' && (
            <>
              <p style={styles.eyebrow}>Shrink The Task</p>
              <h2 style={styles.title}>We only need the doorway.</h2>
              <p style={styles.body}>{buildSupportiveSummary(path)}</p>

              {(path === 'cant_start' || path === 'overwhelmed') && (
                <>
                  <p style={styles.fieldLabel}>What is the task?</p>
                  <input
                    style={styles.input}
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Example: write the report"
                  />
                </>
              )}

              {path === 'lost_it' && (
                <>
                  <p style={styles.fieldLabel}>What were you doing before you lost it?</p>
                  <input
                    style={styles.input}
                    value={previousStep}
                    onChange={(event) => setPreviousStep(event.target.value)}
                    placeholder="Example: I had the document open"
                  />
                  <p style={styles.fieldLabel}>What was the task you were trying to do?</p>
                  <input
                    style={styles.input}
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Example: finish the report"
                  />
                </>
              )}

              {path === 'no_idea' && (
                <>
                  <p style={styles.fieldLabel}>What were you doing before you lost it?</p>
                  <input
                    style={styles.input}
                    value={previousStep}
                    onChange={(event) => setPreviousStep(event.target.value)}
                    placeholder="Example: I was reading the assignment"
                  />
                  <p style={styles.fieldLabel}>What was supposed to come after that?</p>
                  <input
                    style={styles.input}
                    value={nextStepHint}
                    onChange={(event) => setNextStepHint(event.target.value)}
                    placeholder="Example: open the worksheet"
                  />
                </>
              )}

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={continueFromClarify}
                  disabled={!normalizeText(task || nextStepHint)}
                >
                  Find my tiny step
                </button>
                <button type="button" style={styles.secondaryButton} onClick={resetAll}>Start over</button>
              </div>
            </>
          )}

          {stage === 'micro' && (
            <>
              <p style={styles.eyebrow}>Micro Commitment</p>
              <h2 style={styles.title}>Your only job right now:</h2>
              <div style={styles.singleTaskBox}>
                <p style={styles.actionText}>{microStep}</p>
                <p style={styles.body}>Just this. Nothing else.</p>
              </div>

              <div style={styles.optionColumn}>
                <p style={styles.fieldLabel}>Choose a timer</p>
                {availableTimers.map((option) => (
                  <button
                    key={option.minutes}
                    type="button"
                    style={{
                      ...styles.optionButton,
                      opacity: option.locked ? 0.5 : option.minutes === selectedDuration ? 1 : 0.92,
                      borderColor: option.minutes === selectedDuration ? 'rgba(201, 115, 106, 0.42)' : 'rgba(188, 160, 188, 0.22)'
                    }}
                    onClick={() => {
                      if (!option.locked) {
                        setSelectedDuration(option.minutes);
                      }
                    }}
                    disabled={option.locked}
                  >
                    <strong>{option.label}</strong> {' '}
                    <span style={{ color: '#7C6470' }}>{option.helper}</span>
                    {option.locked ? ' - unlocked after your first win' : ''}
                  </button>
                ))}
              </div>

              <div style={styles.buttonRow}>
                <button type="button" style={styles.primaryButton} onClick={startTimer}>Yes, start timer</button>
                <button type="button" style={styles.secondaryButton} onClick={() => acceptSmallerChoice(smallerChoices[0] || microStep)}>Still too big</button>
              </div>

              <div style={styles.helperBox}>
                <p style={styles.fieldLabel}>Even smaller</p>
                <div style={styles.optionColumn}>
                  {smallerChoices.map((choice) => (
                    <button key={choice} type="button" style={styles.optionButton} onClick={() => acceptSmallerChoice(choice)}>
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {stage === 'win' && (
            <>
              <p style={styles.eyebrow}>The Win</p>
              <h2 style={styles.title}>You did the thing.</h2>
              <p style={styles.body}>
                That took more than it should have. That&apos;s not weakness. That&apos;s what it can cost to work with a resistant brain.
              </p>
              <div style={styles.buttonRow}>
                <button type="button" style={styles.primaryButton} onClick={handleNextAction}>Find my next action</button>
                <button type="button" style={styles.secondaryButton} onClick={handleNeedBreak}>I need a break</button>
                <button type="button" style={styles.secondaryButton} onClick={handleDoneForNow}>I&apos;m done for now</button>
              </div>
            </>
          )}

          {stage === 'done' && (
            <>
              <p style={styles.eyebrow}>For Now</p>
              <h2 style={styles.title}>You can stop here.</h2>
              <p style={styles.body}>{sessionOutcome}</p>
              <div style={styles.buttonRow}>
                <button type="button" style={styles.primaryButton} onClick={resetAll}>Start again later</button>
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'timer' && (
        <section style={styles.timerWrap}>
          <p style={styles.eyebrow}>Nova is with you</p>
          <h2 style={styles.timerStep}>{microStep}</h2>
          <p style={styles.timerText}>{formatTime(timeLeft)}</p>
          <div style={styles.timerBar}>
            <div style={{ ...styles.timerFill, width: `${timerProgress}%` }} />
          </div>
          <p style={styles.body}>{PRESENCE_LINES[presenceIndex]}</p>
          <p style={styles.body}>Just you and this one thing.</p>
          <div style={styles.buttonRow}>
            <button type="button" style={styles.secondaryButton} onClick={() => setIsRunning((current) => !current)}>
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={() => {
              setIsRunning(false);
              setTimeLeft(selectedDuration * 60);
            }}>
              Reset
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default FocusRecovery;
