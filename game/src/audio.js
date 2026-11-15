// Sound, synthesised with WebAudio — no audio files, no network. Gunshots are
// a noise burst through a low-pass filter, footsteps a short filtered thump,
// the plant beep a square blip. Created lazily on the first user gesture.
export function createAudio() {
  let ctx = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noiseBurst(duration, filterFreq, gain) {
    const c = ensure(); if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterFreq;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(c.destination); src.start();
  }
  function tone(freq, duration, gain, type = 'square') {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + duration);
  }
  return {
    unlock() { ensure(); },
    shot() { noiseBurst(0.09, 1800, 0.25); tone(160, 0.06, 0.08, 'sawtooth'); },
    distantShot() { noiseBurst(0.12, 700, 0.07); },
    dryFire() { tone(1200, 0.03, 0.05); },
    reload() { tone(500, 0.05, 0.06); tone(700, 0.05, 0.06); },
    step() { noiseBurst(0.05, 300, 0.05); },
    hit() { tone(900, 0.05, 0.08); },
    kill() { tone(660, 0.08, 0.1); tone(990, 0.12, 0.1); },
    beep() { tone(1200, 0.09, 0.1); },
    explosion() { noiseBurst(0.7, 300, 0.5); tone(60, 0.5, 0.25, 'sine'); },
    roundWin() { tone(523, 0.15, 0.1); tone(659, 0.15, 0.1); tone(784, 0.3, 0.1); },
    roundLose() { tone(392, 0.2, 0.1); tone(311, 0.35, 0.1); },
  };
}
