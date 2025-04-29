
// A) Initialize jsPsych
const jsPsych = initJsPsych({
  on_finish: () => jsPsych.data.get().localSave('csv', 'data.csv')
});

// B) WebAudio stimulus generator (same as MATLAB behavior)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

async function playStimulus({ duration, lowcut, highcut, ampStim, ampNoise, onset, present }) {
  const sr = audioContext.sampleRate;
  const buf = audioContext.createBuffer(1, sr * duration, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioContext.createBufferSource();
  src.buffer = buf;

  // Band-pass filter
  const bp = audioContext.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (lowcut + highcut) / 2;
  bp.Q.value = (highcut - lowcut) / (lowcut + highcut);
  const noiseGain = audioContext.createGain();
  noiseGain.gain.value = ampNoise;
  src.connect(bp).connect(noiseGain).connect(audioContext.destination);
  src.start();

  if (present) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(lowcut, audioContext.currentTime + onset);
    osc.frequency.linearRampToValueAtTime(highcut, audioContext.currentTime + onset + 0.5);
    const stimGain = audioContext.createGain();
    stimGain.gain.value = ampStim;
    osc.connect(stimGain).connect(audioContext.destination);
    osc.start(audioContext.currentTime + onset);
    osc.stop(audioContext.currentTime + onset + 0.5);
  }

  src.stop(audioContext.currentTime + duration);
  await new Promise(r => setTimeout(r, duration * 1000 + 50));
}

// C) Timeline structure
const timeline = [];

// Participant ID input
timeline.push({
  type: jsPsychSurveyText,
  questions: [{ prompt: "Enter participant number:", name: "pid" }],
  on_finish: data => jsPsych.data.addProperties({ participant: data.response.pid })
});

// Intro
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<h1 style='color:white'>Signal Detection Task</h1>
             <p style='color:white'>You'll hear noise, sometimes with a tone. Click when ready.</p>`,
  choices: ["Start"]
});

// Practice trials (signal always present)
for (let i = 0; i < 5; i++) {
  timeline.push({
    type: 'call-function',
    func: () => playStimulus({
      duration: 2.5,
      lowcut: 50,
      highcut: 1000,
      ampStim: 0.1,
      ampNoise: 0.05,
      onset: 1.75,
      present: 1
    })
  });
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: '<h2 style="color:white">Did you hear the tone?</h2>',
    choices: ['Yes', 'No']
  });
}

// Real trials (50/50 presence)
const mainTrials = jsPsych.randomization.shuffle([...Array(10).fill(1), ...Array(10).fill(0)]);
mainTrials.forEach(present => {
  timeline.push({
    type: 'call-function',
    func: () => playStimulus({
      duration: 2.5,
      lowcut: 50,
      highcut: 1000,
      ampStim: 0.1,
      ampNoise: 0.07,
      onset: 1.75,
      present
    })
  });
  timeline.push({
    type: jsPsychHtmlSliderResponse,
    stimulus: '<h2 style="color:white">Confidence Level</h2>',
    labels: ['-100', '0', '+100'],
    min: -100,
    max: 100,
    start: 0
  });
  timeline.push({
    type: jsPsychHtmlSliderResponse,
    stimulus: '<h2 style="color:white">Perceptual Reliance</h2>',
    labels: ['-100', '0', '+100'],
    min: -100,
    max: 100,
    start: 0
  });
});

// Start the experiment
jsPsych.run(timeline);
