// All sound is synthesized with WebAudio: no audio files, no network.
// A little autumn tune loops under the run; short blips mark jumps,
// pickups, hits and the escape fanfare.
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  G3: 196.0, A3: 220.0, B3: 246.94, E3: 164.81, D3: 146.83,
};

// A gentle harvest melody (C major, 8 bars) the music loop walks through.
const MELODY = [
  ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5],
  ['D4', 1], ['C4', 1], ['D4', 0.5], ['E4', 0.5], ['G4', 1],
  ['E4', 0.5], ['C4', 0.5], ['D4', 1], ['E4', 1], ['D4', 0.5],
  ['C4', 0.5], ['D4', 1], ['E4', 1], ['G4', 0.5], ['A4', 0.5],
  ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['G3', 1],
  ['A3', 0.5], ['B3', 0.5], ['C4', 1], ['D4', 1], ['E4', 2],
];
const BEAT_SECONDS = 0.34;

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicOn = false;
  }

  /** Create the audio context on the first user gesture (browsers demand it). */
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** A quick two-note gobble-flap for jumping. */
  jump() {
    this.tone(520, 0.09, 'square', 0.10, 0, 760);
    this.tone(660, 0.08, 'square', 0.07, 0.05, 880);
  }

  flap() {
    this.tone(430, 0.08, 'triangle', 0.10, 0, 640);
  }

  corn() {
    this.tone(880, 0.07, 'sine', 0.14);
    this.tone(1318, 0.12, 'sine', 0.12, 0.06);
  }

  feather() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.12, i * 0.07));
  }

  hit() {
    this.tone(160, 0.22, 'sawtooth', 0.18, 0, 70);
    this.tone(90, 0.3, 'square', 0.14, 0.02, 50);
  }

  /** The farmer's angry shout when he closes in. */
  shout() {
    this.tone(220, 0.16, 'sawtooth', 0.12, 0, 330);
    this.tone(180, 0.18, 'sawtooth', 0.12, 0.14, 260);
  }

  caught() {
    [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.14, i * 0.22));
  }

  escaped() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, i * 0.12));
    this.tone(1568, 0.6, 'sine', 0.12, 0.62);
  }

  click() {
    this.tone(700, 0.05, 'sine', 0.1);
  }

  startMusic() {
    if (this.musicOn || !this.context) return;
    this.musicOn = true;
    this.musicStep = 0;
    const tick = () => {
      if (!this.musicOn) return;
      const [name, beats] = MELODY[this.musicStep % MELODY.length];
      this.tone(NOTES[name], beats * BEAT_SECONDS * 0.95, 'triangle', 0.055);
      if (this.musicStep % 4 === 0) {
        const bass = ['C3', 'G3', 'A3', 'F3'][Math.floor(this.musicStep / 4) % 4];
        const bassFreq = { C3: 130.81, G3: 196.0, A3: 220.0, F3: 174.61 }[bass];
        this.tone(bassFreq, beats * BEAT_SECONDS * 1.8, 'sine', 0.05);
      }
      this.musicStep += 1;
      this.musicTimer = setTimeout(tick, beats * BEAT_SECONDS * 1000);
    };
    tick();
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }
}
