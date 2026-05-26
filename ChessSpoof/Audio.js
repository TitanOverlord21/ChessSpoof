class GameAudio {
  constructor() {
    this.context = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.7;
    this.musicStarted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensureContext() {
    if (!this.context) {
      this.context = new AudioContext();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.context.destination);
      this.updateGains();
    }

    if (this.context.state === "suspended") {
      return this.context.resume();
    }

    return Promise.resolve();
  }

  updateGains() {
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  setMusicVolume(percent) {
    this.musicVolume = Math.max(0, Math.min(1, percent / 100)) * 0.45;
    this.updateGains();
  }

  setSfxVolume(percent) {
    this.sfxVolume = Math.max(0, Math.min(1, percent / 100));
    this.updateGains();
  }

  async unlock() {
    await this.ensureContext();
    this.startMusic();
  }

  playTone(frequency, duration, type = "sine", gainScale = 1) {
    if (!this.context || this.sfxVolume <= 0) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22 * gainScale, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playNoiseSlide() {
    if (!this.context || this.sfxVolume <= 0) {
      return;
    }

    const now = this.context.currentTime;
    const duration = 0.18;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  playSelect() {
    this.playTone(720, 0.06, "triangle", 1);
    this.playTone(980, 0.05, "sine", 0.55);
  }

  playDeselect() {
    this.playTone(420, 0.07, "triangle", 0.85);
  }

  playSlide() {
    this.playNoiseSlide();
    this.playTone(180, 0.12, "sine", 0.35);
  }

  playMusicChord(frequencies, duration) {
    if (!this.context || this.musicVolume <= 0) {
      return;
    }

    const now = this.context.currentTime;
    for (const frequency of frequencies) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration - 0.05);

      oscillator.connect(gain);
      gain.connect(this.musicGain);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }
  }

  startMusic() {
    if (this.musicStarted || !this.context) {
      return;
    }

    this.musicStarted = true;
    const progression = [
      [196.0, 246.94, 293.66],
      [174.61, 220.0, 261.63],
      [220.0, 261.63, 329.63],
      [196.0, 233.08, 293.66],
    ];

    const tick = () => {
      if (!this.context || this.musicVolume <= 0) {
        this.musicTimer = window.setTimeout(tick, 1400);
        this.musicStep = (this.musicStep + 1) % progression.length;
        return;
      }

      this.playMusicChord(progression[this.musicStep], 1.35);
      this.musicStep = (this.musicStep + 1) % progression.length;
      this.musicTimer = window.setTimeout(tick, 1400);
    };

    tick();
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicStarted = false;
    this.musicStep = 0;
  }
}

const gameAudio = new GameAudio();
