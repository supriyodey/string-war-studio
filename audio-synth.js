// Sound Engine for String War: Web Audio API Synthesizer + Custom Audio Player

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.bgmAudio = null;
    this.customBgmUrl = null;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.8;
    this.muted = false;
    this.synthBgmActive = false;
    this.synthBgmTimer = null;
    this.destinationNode = null;
    this.recorderDestination = null;

    // Musical scale for harmonic plucks (C Pentatonic / Blues scale for satisfying arcade vibe)
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    // Node for stream recording
    this.recorderDestination = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.recorderDestination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Pluck sound for string vibrations and ball bounces
  playPluck(freqIdx = 0, pitchFactor = 1.0) {
    if (this.muted) return;
    this.init();
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = this.scale[freqIdx % this.scale.length] * pitchFactor;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    // slight pitch drop like real plucked string
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.96, t + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Snappy string cut / snap sound
  playSnap() {
    if (this.muted) return;
    this.init();
    this.resume();

    const t = this.ctx.currentTime;
    // High noise burst + sharp FM click
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.01));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Heavy clash / impact between two balls
  playCollision(impact = 1.0) {
    if (this.muted) return;
    this.init();
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 160 * Math.min(2.0, Math.max(0.6, impact));
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    gain.gain.setValueAtTime(this.sfxVolume * 0.5 * Math.min(1.2, impact), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Elimination boom / explosion sound
  playElimination() {
    if (this.muted) return;
    this.init();
    this.resume();

    const t = this.ctx.currentTime;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.55);

    oscGain.gain.setValueAtTime(this.sfxVolume * 0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.65);

    // Noise explosion decay
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(150, t + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.sfxVolume * 0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
  }

  // Grand Victory Fanfare
  playVictory() {
    if (this.muted) return;
    this.init();
    this.resume();

    const chords = [
      [523.25, 659.25, 783.99], // C5, E5, G5
      [587.33, 739.99, 880.00], // D5, F#5, A5
      [659.25, 830.61, 987.77], // E5, G#5, B5
      [783.99, 987.77, 1174.66] // G5, B5, D6
    ];

    const t0 = this.ctx.currentTime;
    chords.forEach((chord, step) => {
      const stepTime = t0 + step * 0.22;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, stepTime);

        // Warm brass filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, stepTime);

        const dur = (step === chords.length - 1) ? 1.4 : 0.25;
        gain.gain.setValueAtTime(this.sfxVolume * 0.35, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(stepTime);
        osc.stop(stepTime + dur);
      });
    });
  }

  // Built-in Synth Background Music generator for fast rhythmic beat
  startSynthBgm() {
    if (this.customBgmUrl || this.synthBgmActive || this.muted) return;
    this.init();
    this.resume();
    this.synthBgmActive = true;

    let beat = 0;
    const bpm = 132;
    const interval = (60 / bpm) * 1000 / 2; // 8th notes

    const bassNotes = [110, 110, 130.81, 110, 98.0, 110, 146.83, 130.81];

    this.synthBgmTimer = setInterval(() => {
      if (!this.synthBgmActive || this.muted) return;
      const t = this.ctx.currentTime;

      // Kick drum on beats 0, 4
      if (beat % 4 === 0) {
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.frequency.setValueAtTime(130, t);
        kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        kGain.gain.setValueAtTime(this.bgmVolume * 0.7, t);
        kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        kick.connect(kGain);
        kGain.connect(this.masterGain);
        kick.start(t);
        kick.stop(t + 0.16);
      }

      // Snare / clap on beat 2
      if (beat % 4 === 2) {
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
        }
        const sSource = this.ctx.createBufferSource();
        sSource.buffer = buffer;
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(this.bgmVolume * 0.45, t);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        sSource.connect(sGain);
        sGain.connect(this.masterGain);
        sSource.start(t);
      }

      // Bass synth line
      const bassOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      const bFreq = bassNotes[beat % bassNotes.length];
      bassOsc.frequency.setValueAtTime(bFreq, t);

      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(450, t);

      bGain.gain.setValueAtTime(this.bgmVolume * 0.28, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      bassOsc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.masterGain);

      bassOsc.start(t);
      bassOsc.stop(t + 0.2);

      beat = (beat + 1) % 16;
    }, interval);
  }

  stopSynthBgm() {
    this.synthBgmActive = false;
    if (this.synthBgmTimer) {
      clearInterval(this.synthBgmTimer);
      this.synthBgmTimer = null;
    }
  }

  // Custom uploaded music handling
  setCustomBgm(audioFile) {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
    }
    this.stopSynthBgm();

    const url = URL.createObjectURL(audioFile);
    this.customBgmUrl = url;
    this.bgmAudio = new Audio(url);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.bgmVolume;

    // Connect custom audio into WebAudio master graph so it records into MediaRecorder
    this.init();
    try {
      const srcNode = this.ctx.createMediaElementSource(this.bgmAudio);
      const bgmGain = this.ctx.createGain();
      bgmGain.gain.value = this.bgmVolume;
      srcNode.connect(bgmGain);
      bgmGain.connect(this.masterGain);
      this.customBgmGain = bgmGain;
    } catch (e) {
      console.warn("MediaElementSource hookup error:", e);
    }
  }

  playBgm() {
    if (this.muted) return;
    if (this.customBgmUrl && this.bgmAudio) {
      this.bgmAudio.currentTime = 0;
      this.bgmAudio.play().catch(e => console.log("BGM play error", e));
    } else {
      this.startSynthBgm();
    }
  }

  pauseBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.stopSynthBgm();
  }

  stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopSynthBgm();
  }
}

window.soundEngine = new SoundEngine();
