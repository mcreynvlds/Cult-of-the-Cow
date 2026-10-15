'use strict';
// Tiny synthesized sound kit (no audio files needed). The moo is the star.

const Sfx = {
  ctx: null,
  master: null,
  muted: false,

  init() {
    try { this.muted = localStorage.getItem('cotc_mute') === '1'; } catch (e) { /* storage blocked */ }
  },

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('cotc_mute', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.45;
  },

  osc(type, f0, f1, dur, vol, delay = 0, filter = 0) {
    if (!this.ctx || this.muted) return null;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filter;
      g.connect(f); f.connect(this.master);
    } else g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
    return o;
  },

  noise(dur, vol, freq = 1500, delay = 0, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },

  moo(pitch = 1, len = 0.85) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    const base = 130 * pitch;
    o.frequency.setValueAtTime(base * 0.85, t);
    o.frequency.linearRampToValueAtTime(base * 1.12, t + 0.15);
    o.frequency.linearRampToValueAtTime(base, t + len * 0.6);
    o.frequency.linearRampToValueAtTime(base * 0.78, t + len);
    o2.frequency.setValueAtTime(base * 0.5, t);
    o2.frequency.linearRampToValueAtTime(base * 0.4, t + len);
    lfo.frequency.value = 5.5; lfoG.gain.value = 4 * pitch;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.linearRampToValueAtTime(1100, t + 0.2);
    f.frequency.linearRampToValueAtTime(500, t + len);
    f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.setValueAtTime(0.35, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.master);
    [o, o2, lfo].forEach((n) => { n.start(t); n.stop(t + len + 0.05); });
  },

  // Cowbell: two detuned squares through a bandpass. More cowbell.
  bell(vol = 0.18) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    f.connect(g); g.connect(this.master);
    [545, 815].forEach((fr) => {
      const o = this.ctx.createOscillator();
      o.type = 'square'; o.frequency.value = fr; o.connect(f);
      o.start(t); o.stop(t + 0.4);
    });
  },

  swing() { this.noise(0.12, 0.25, 2600, 0, 'bandpass'); this.bell(0.07); },
  hit() { this.osc('square', 240, 70, 0.1, 0.18); this.noise(0.08, 0.3, 900); },
  hurt() { this.osc('sawtooth', 320, 70, 0.32, 0.22, 0, 1400); this.moo(1.5, 0.3); },
  coin() { this.osc('square', 990, null, 0.05, 0.07); this.osc('square', 1480, null, 0.09, 0.07, 0.05); },
  pickup() { this.osc('triangle', 520, 1040, 0.12, 0.15); },
  dodge() { this.noise(0.15, 0.18, 700, 0, 'bandpass'); },
  door() { this.osc('triangle', 180, 420, 0.4, 0.2); this.osc('triangle', 270, 630, 0.4, 0.12, 0.08); },
  select() { this.osc('triangle', 660, 760, 0.06, 0.12); },
  deny() { this.osc('square', 160, 120, 0.15, 0.12); },
  shoot() { this.osc('square', 500, 200, 0.12, 0.08); },
  enemyDie() { this.noise(0.25, 0.3, 600); this.osc('sawtooth', 300, 40, 0.3, 0.12); },
  chop() { this.noise(0.35, 0.6, 500); this.osc('square', 120, 30, 0.4, 0.3); },
  roar() { this.osc('sawtooth', 110, 45, 1.1, 0.3, 0, 600); this.noise(0.9, 0.25, 300); },
  slam() { this.osc('sine', 90, 30, 0.5, 0.5); this.noise(0.4, 0.4, 250); },
  holyMoo() { this.moo(0.8, 1.0); this.osc('sine', 220, 880, 0.6, 0.15); },
  chime() { [523, 659, 784, 1046].forEach((f, i) => this.osc('sine', f, null, 0.5, 0.12, i * 0.09)); },
  levelUp() { [392, 523, 659, 784, 1046].forEach((f, i) => this.osc('triangle', f, null, 0.35, 0.12, i * 0.07)); },
  sad() { [392, 349, 311, 262].forEach((f, i) => this.osc('triangle', f, null, 0.4, 0.12, i * 0.15)); },
  blip() { this.osc('square', 760 + Math.random() * 120, null, 0.025, 0.035); },
};
