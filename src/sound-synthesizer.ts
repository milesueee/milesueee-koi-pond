import { AUDIO } from "./audio-config";

export interface WaterDropOptions {
  pitchMultiplier?: number;
  volume?: number;
}

export interface WaterRippleOptions {
  pitchMultiplier?: number;
  volume?: number;
}

export interface WaterDipOptions {
  volume?: number;
}

export interface WaterSplashOptions {
  intensity?: "gentle" | "medium" | "energetic";
  volume?: number;
}

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled: boolean = false;
  private masterVolume: number = AUDIO.effects.volume;
  private dropVolume: number = AUDIO.effects.waterDropVolume;
  private rippleVolume: number = AUDIO.effects.waterRippleVolume;
  private dipVolume: number = AUDIO.effects.waterDipVolume;
  private splashVolume: number = AUDIO.effects.waterSplashVolume;

  public setContext(context: AudioContext): void {
    if (this.ctx === context) return;
    this.ctx = context;
    try {
      this.masterGain = context.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, context.currentTime);
      this.masterGain.connect(context.destination);
    } catch {
      // Audio nodes creation might fail in unit tests or unsupported environments
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setVolume(volume: number): void {
    this.setMasterVolume(volume);
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
  }

  public setDropVolume(volume: number): void {
    this.dropVolume = Math.max(0, Math.min(1, volume));
  }

  public setRippleVolume(volume: number): void {
    this.rippleVolume = Math.max(0, Math.min(1, volume));
  }

  public setDipVolume(volume: number): void {
    this.dipVolume = Math.max(0, Math.min(1, volume));
  }

  public setSplashVolume(volume: number): void {
    this.splashVolume = Math.max(0, Math.min(1, volume));
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== context.sampleRate) {
      const length = Math.round(context.sampleRate * 0.7);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0.0;
      let b1 = 0.0;
      let b2 = 0.0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // 3-pole pink-filtered noise for soft natural water turbulence
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        data[i] = (b0 + b1 + b2) * 0.45;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  /**
   * Physically based Minnaert water droplet (used for taps, raindrop impacts).
   * Features a crisp surface impact transient followed by an upward-rising bubble cavity chirp.
   */
  public playWaterDrop(options?: WaterDropOptions): void {
    if (!this.enabled || !this.ctx || !this.masterGain || this.ctx.state !== "running") return;
    try {
      const now = this.ctx.currentTime;
      const pitchVar = 0.92 + Math.random() * 0.16;
      const baseFreq = (740 + Math.random() * 240) * pitchVar * (options?.pitchMultiplier ?? 1);
      const riseRatio = 1.28 + Math.random() * 0.12;
      const duration = 0.065 + Math.random() * 0.02;
      const volume = options?.volume ?? this.dropVolume;

      // 1. Initial surface impact click (micro transient, 4ms)
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = "triangle";
      clickOsc.frequency.setValueAtTime(baseFreq * 2.2, now);
      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.001);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006);
      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);
      clickOsc.start(now);
      clickOsc.stop(now + 0.008);

      // 2. Resonant bubble cavity (Minnaert upward frequency chirp)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * riseRatio, now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.005);
    } catch {
      // Audio scheduling can fail if context is torn down
    }
  }

  /**
   * Water ripple lap sound: lower-frequency gentle liquid bubble + subtle water displacement wash.
   */
  public playWaterRipple(options?: WaterRippleOptions): void {
    if (!this.enabled || !this.ctx || !this.masterGain || this.ctx.state !== "running") return;
    try {
      const now = this.ctx.currentTime;
      const pitchVar = 0.94 + Math.random() * 0.12;
      const baseFreq = (400 + Math.random() * 120) * pitchVar * (options?.pitchMultiplier ?? 1);
      const duration = 0.09;
      const volume = options?.volume ?? this.rippleVolume;

      // 1. Gentle low bubble
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.22, now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.005);

      // 2. Soft fluid displacement wash
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(this.ctx);
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.12);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.14);
    } catch {
      // Ignore
    }
  }

  /**
   * Lotus pad dip: deep resonant gloop accompanied by water displacement slosh and a micro companion bubble.
   */
  public playWaterDip(options?: WaterDipOptions): void {
    if (!this.enabled || !this.ctx || !this.masterGain || this.ctx.state !== "running") return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 260 + Math.random() * 50;
      const duration = 0.13;
      const volume = options?.volume ?? this.dipVolume;

      // 1. Primary submerged gloop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);

      // 2. Liquid displacement noise
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(this.ctx);
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.18);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(volume * 0.55, now + 0.015);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.22);

      // 3. Companion micro-bubble 24ms later
      const compTime = now + 0.024;
      const compOsc = this.ctx.createOscillator();
      const compGain = this.ctx.createGain();
      compOsc.type = "sine";
      compOsc.frequency.setValueAtTime(840, compTime);
      compOsc.frequency.exponentialRampToValueAtTime(1080, compTime + 0.038);

      compGain.gain.setValueAtTime(0.0001, compTime);
      compGain.gain.linearRampToValueAtTime(volume * 0.35, compTime + 0.002);
      compGain.gain.exponentialRampToValueAtTime(0.0001, compTime + 0.038);

      compOsc.connect(compGain);
      compGain.connect(this.masterGain);
      compOsc.start(compTime);
      compOsc.stop(compTime + 0.045);
    } catch {
      // Ignore
    }
  }

  /**
   * Multi-layered water splash:
   * 1. Initial surface impact slap (high bandpass noise)
   * 2. Churning fluid body wash (swept lowpass noise)
   * 3. Cavitation micro-bubble cluster (randomized rising droplet chirps)
   */
  public playWaterSplash(options?: WaterSplashOptions): void {
    if (!this.enabled || !this.ctx || !this.masterGain || this.ctx.state !== "running") return;
    try {
      const now = this.ctx.currentTime;
      const intensity = options?.intensity ?? "medium";
      const baseVol = options?.volume ?? this.splashVolume;

      const profile = {
        gentle: { slapVol: 0.5, bodyVol: 0.6, duration: 0.26, bubbleCount: 4, mult: 0.8 },
        medium: { slapVol: 0.85, bodyVol: 0.9, duration: 0.36, bubbleCount: 6, mult: 1.0 },
        energetic: { slapVol: 1.15, bodyVol: 1.2, duration: 0.44, bubbleCount: 8, mult: 1.25 },
      }[intensity];

      const duration = profile.duration;
      const volume = baseVol * profile.mult;

      // 1. Initial surface impact slap
      const slapSource = this.ctx.createBufferSource();
      slapSource.buffer = this.getNoiseBuffer(this.ctx);
      const slapFilter = this.ctx.createBiquadFilter();
      slapFilter.type = "bandpass";
      slapFilter.frequency.setValueAtTime(2200 + Math.random() * 300, now);
      slapFilter.Q.setValueAtTime(1.6, now);

      const slapGain = this.ctx.createGain();
      slapGain.gain.setValueAtTime(0.0001, now);
      slapGain.gain.linearRampToValueAtTime(volume * profile.slapVol, now + 0.003);
      slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      slapSource.connect(slapFilter);
      slapFilter.connect(slapGain);
      slapGain.connect(this.masterGain);
      slapSource.start(now);
      slapSource.stop(now + 0.06);

      // 2. Churning fluid body wash
      const bodySource = this.ctx.createBufferSource();
      bodySource.buffer = this.getNoiseBuffer(this.ctx);
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = "lowpass";
      bodyFilter.frequency.setValueAtTime(1100, now);
      bodyFilter.frequency.exponentialRampToValueAtTime(220, now + duration * 0.85);

      const bodyGain = this.ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.linearRampToValueAtTime(volume * profile.bodyVol, now + 0.015);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      bodySource.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(this.masterGain);
      bodySource.start(now);
      bodySource.stop(now + duration + 0.01);

      // 3. Cavitation micro-bubble cluster
      for (let i = 0; i < profile.bubbleCount; i++) {
        const offset = 0.012 + Math.random() * (duration * 0.52);
        const bStart = now + offset;
        const f0 = 750 + Math.random() * 1350; // 750Hz to 2100Hz
        const bRise = 1.25 + Math.random() * 0.16;
        const bDur = 0.025 + Math.random() * 0.035;
        const bVol = volume * (0.35 + Math.random() * 0.45);

        const osc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f0, bStart);
        osc.frequency.exponentialRampToValueAtTime(f0 * bRise, bStart + bDur);

        bGain.gain.setValueAtTime(0.0001, bStart);
        bGain.gain.linearRampToValueAtTime(bVol, bStart + 0.002);
        bGain.gain.exponentialRampToValueAtTime(0.0001, bStart + bDur);

        osc.connect(bGain);
        bGain.connect(this.masterGain);
        osc.start(bStart);
        osc.stop(bStart + bDur + 0.005);
      }
    } catch {
      // Ignore
    }
  }

  public dispose(): void {
    this.enabled = false;
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
    this.ctx = null;
    this.noiseBuffer = null;
  }
}
