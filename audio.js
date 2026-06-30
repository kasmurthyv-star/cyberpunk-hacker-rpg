/**
 * Netrunner Audio Synth Engine
 * Uses Web Audio API to procedurally generate retro-cyberpunk sound effects.
 * No external file downloads needed.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.enabled;
  }

  // Play a simple custom note/oscillator
  playTone(freq, type, duration, volume = 0.1, delay = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Resume context if browser suspended it
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
    // Exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  // Typwriter keypress click sound
  playClick() {
    // White noise style click or high frequency sine tone
    this.playTone(800 + Math.random() * 400, 'triangle', 0.05, 0.03);
  }

  // Hovering buttons or nodes
  playHover() {
    this.playTone(300, 'sine', 0.08, 0.04);
  }

  // Success beep for matching hex sequences
  playSuccess() {
    const time = 0.1;
    this.playTone(587.33, 'triangle', 0.12, 0.08, 0); // D5
    this.playTone(880, 'triangle', 0.2, 0.08, 0.08);    // A5
  }

  // Hacking grid selection mismatch
  playFailure() {
    const time = 0.15;
    this.playTone(180, 'sawtooth', 0.3, 0.1);
  }

  // General navigation confirmation
  playConfirm() {
    this.playTone(523.25, 'sine', 0.1, 0.06); // C5
    this.playTone(659.25, 'sine', 0.15, 0.06, 0.06); // E5
  }

  // Node selection sound
  playMove() {
    this.playTone(400, 'triangle', 0.1, 0.05);
    this.playTone(300, 'triangle', 0.1, 0.05, 0.05);
  }

  // Heat Trace Warning Sound (Repeating alarm)
  playAlarm() {
    this.playTone(900, 'sawtooth', 0.15, 0.06);
    this.playTone(700, 'sawtooth', 0.15, 0.06, 0.15);
  }

  // Level Up or Major Database Hacked sound
  playHackComplete() {
    const duration = 0.15;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.4, 0.05, idx * 0.06);
    });
  }

  // Startup Neural Jack-in
  playJackIn() {
    this.init();
    if (!this.enabled || !this.ctx) return;
    
    // Sweeping synthesizer sound
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 1.2);

    gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.2);
  }

  // Game over crash
  playGameOver() {
    this.init();
    if (!this.enabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 1.5);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.5);
  }
}

// Global sound manager instance
const sfx = new SoundEngine();
window.sfx = sfx;
