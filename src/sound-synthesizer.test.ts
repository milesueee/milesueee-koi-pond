import { describe, expect, it, vi } from "vitest";
import { SoundSynthesizer } from "./sound-synthesizer";

function createMockAudioContext() {
  const destination = {};
  const mockParam = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelAndHoldAtTime: vi.fn(),
  });

  const ctx = {
    currentTime: 1.0,
    state: "running" as AudioContextState,
    sampleRate: 44100,
    destination,
    createGain: vi.fn(() => ({
      gain: mockParam(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: "sine" as OscillatorType,
      frequency: mockParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: "lowpass" as BiquadFilterType,
      frequency: mockParam(),
      Q: mockParam(),
      connect: vi.fn(),
    })),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    resume: vi.fn(async () => undefined),
  };

  return ctx as unknown as AudioContext;
}

describe("SoundSynthesizer", () => {
  it("initializes without throwing even if context is absent", () => {
    const synth = new SoundSynthesizer();
    expect(() => {
      synth.playWaterDrop();
      synth.playWaterDip();
      synth.playWaterSplash();
    }).not.toThrow();
  });

  it("does not play sounds when disabled", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(false);

    synth.playWaterDrop();
    synth.playWaterDip();
    synth.playWaterSplash();

    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it("synthesizes water drop when enabled", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(true);

    synth.playWaterDrop();

    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it("synthesizes water dip when enabled", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(true);

    synth.playWaterDip();

    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createBiquadFilter).toHaveBeenCalled();
  });

  it("synthesizes water ripple when enabled", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(true);

    synth.playWaterRipple();

    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createBufferSource).toHaveBeenCalled();
  });

  it("synthesizes water splash with different intensities when enabled", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(true);

    synth.playWaterSplash({ intensity: "gentle" });
    expect(ctx.createBufferSource).toHaveBeenCalled();
    expect(ctx.createOscillator).toHaveBeenCalled();

    synth.playWaterSplash({ intensity: "energetic" });
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(4); // 2 sources per splash (slap + body)
  });

  it("updates individual volume levels via setters without error", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);

    expect(() => {
      synth.setMasterVolume(0.5);
      synth.setDropVolume(0.3);
      synth.setRippleVolume(0.25);
      synth.setDipVolume(0.4);
      synth.setSplashVolume(0.35);
    }).not.toThrow();
  });

  it("disposes cleanly without throwing", () => {
    const ctx = createMockAudioContext();
    const synth = new SoundSynthesizer();
    synth.setContext(ctx);
    synth.setEnabled(true);

    expect(() => synth.dispose()).not.toThrow();
    synth.playWaterDrop();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
});
