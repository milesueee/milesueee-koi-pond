// Audio tuning. Volumes use the Web Audio gain scale: 0 is silent and 1 is full.
export const AUDIO = {
  defaultEnabled: false,
  toggleFadeSeconds: 0.45,
  ambient: {
    source: "audio/ambient-river-v1.m4a",
    volume: 0.3,
  },
  effects: {
    volume: 0.22,
    waterDropVolume: 0.2,
    waterRippleVolume: 0.16,
    waterDipVolume: 0.24,
    waterSplashVolume: 0.18,
  },
} as const;
