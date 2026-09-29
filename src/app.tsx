import {
  Cloud,
  CloudFog,
  CloudRain,
  EyeOff,
  Fish,
  Maximize2,
  Minus,
  Minimize2,
  Moon,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Sun,
  Sunset as SunsetIcon,
  Undo2,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { GitHubStars } from "@/components/github-stars";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AUDIO } from "./audio-config";
import { SoundSynthesizer } from "./sound-synthesizer";
import { ConfigEditor } from "./config-editor";
import { ScreensaverClock } from "./screensaver-clock";
import {
  CANVAS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  FIXED_STEP,
  setCanvasSize,
} from "./config";
import { FishRenderer } from "./fish-renderer";
import { useIsMobile } from "./hooks/use-mobile";
import { clamp, vec, type Vec2 } from "./math";
import { connectSettingsEffects } from "./settings/effects";
import { connectPersistence, loadInto } from "./settings/persistence";
import { useSetting, useSettingsMeta } from "./settings/react";
import { settings } from "./settings/store";
import type { SectionId } from "./settings/definition";
import { School } from "./school";
import {
  DEFAULT_WEATHER_PRESET_ID,
  getWeatherPreset,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "./weather";

interface SceneStats {
  koi: number;
}

interface PondRuntime {
  school: School;
  renderer: FishRenderer;
  showDebug: boolean;
}

interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  resolution: string;
  koiCount: number;
  minnowCount: number;
}

const emptyStats: SceneStats = {
  koi: FISH.initialCount,
};

const AMBIENT_IDLE_DELAY_MS = 3500;
const SCREENSAVER_IDLE_DELAY_MS = 10000;
const GITHUB_REPOSITORY = "milesueee/milesueee-koi-pond";

// Restores v2 (or migrates v1) localStorage settings into the store before
// the first render, and wires up debounced+pagehide saving from then on.
loadInto(settings);
connectPersistence(settings);

function pondRenderSize(display: HTMLElement): { width: number; height: number } {
  const { width, height } = display.getBoundingClientRect();
  const portrait =
    window.matchMedia("(max-width: 700px) and (orientation: portrait)").matches &&
    width > 0 &&
    height > 0;
  if (portrait) {
    const renderWidth = Math.min(
      CANVAS.width,
      Math.max(CANVAS.height, Math.round(width * 0.7)),
    );
    return {
      width: renderWidth,
      height: Math.max(CANVAS.height, Math.round((renderWidth * height) / width)),
    };
  }

  const mobileLandscape =
    window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches &&
    width > 0 &&
    height > 0;
  if (mobileLandscape) {
    const renderHeight = CANVAS.height;
    const renderWidth = Math.max(
      CANVAS.width,
      Math.round((renderHeight * width) / height),
    );
    return {
      width: renderWidth,
      height: renderHeight,
    };
  }

  return { width: CANVAS.width, height: CANVAS.height };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function sceneStats(runtime: PondRuntime): SceneStats {
  return {
    koi: runtime.school.count,
  };
}

function WeatherIcon({ id }: { id: WeatherPresetId }) {
  switch (id) {
    case "sunny":
      return <Sun aria-hidden="true" />;
    case "deep-clear":
      return <Waves aria-hidden="true" />;
    case "overcast":
      return <Cloud aria-hidden="true" />;
    case "mist":
      return <CloudFog aria-hidden="true" />;
    case "sunset":
      return <SunsetIcon aria-hidden="true" />;
    case "moonlight":
      return <Moon aria-hidden="true" />;
    case "rain":
      return <CloudRain aria-hidden="true" />;
  }
}

function useHoldToRepeat(action: () => void, disabled: boolean) {
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isRepeatingRef = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  useEffect(() => () => stop(), [stop]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || disabled) return;
      stop();
      isRepeatingRef.current = false;
      timerRef.current = window.setTimeout(() => {
        isRepeatingRef.current = true;
        actionRef.current();
        intervalRef.current = window.setInterval(() => {
          actionRef.current();
        }, 80);
      }, 350);
    },
    [disabled, stop],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isRepeatingRef.current) {
        event.preventDefault();
        isRepeatingRef.current = false;
        return;
      }
      if (!disabled) {
        actionRef.current();
      }
    },
    [disabled],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: handleClick,
  };
}

export function App() {
  const isMobile = useIsMobile();
  const stageRef = useRef<HTMLElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const isPointerDownRef = useRef(false);
  const lastPointerPosRef = useRef<Vec2 | null>(null);
  const lastRipplePosRef = useRef<Vec2 | null>(null);
  const lastLotusAudioPosRef = useRef<Vec2 | null>(null);
  const activeLeafIndexRef = useRef<number | null>(null);
  const isDraggingLotusRef = useRef(false);
  const ambientAudioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioGainRef = useRef<GainNode | null>(null);
  const ambientAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientAudioLoadingRef = useRef<Promise<void> | null>(null);
  const soundSynthRef = useRef<SoundSynthesizer>(new SoundSynthesizer());
  const runtimeRef = useRef<PondRuntime | null>(null);
  const ambientModeRef = useRef(false);
  const soundEnabledRef = useRef<boolean>(AUDIO.defaultEnabled);
  const [stats, setStats] = useState<SceneStats>(emptyStats);
  const [debugHudOpen, setDebugHudOpen] = useState(false);
  const debugHudOpenRef = useRef(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTimeMs: 16.6,
    resolution: "1920×1080 (@1.0x)",
    koiCount: FISH.initialCount,
    minnowCount: 48,
  });
  const [showInterface, setShowInterface] = useState(true);
  const [ambientMode, setAmbientMode] = useState(false);
  const [ambientControlsVisible, setAmbientControlsVisible] = useState(true);
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    AUDIO.defaultEnabled,
  );
  const [displayWhenUiHidden] = useSetting<boolean>([
    "screensaver",
    "displayWhenUiHidden",
  ]);
  const settingsMeta = useSettingsMeta();
  const { weather: weatherPreset, rain: rainEnabled, canUndo } = settingsMeta;
  const [selectedFamily, setSelectedFamily] = useState(0);
  const [previewFamily, setPreviewFamily] = useState<number | null>(null);
  const previewFamilyRef = useRef<number | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const startAmbientAudio = useCallback(async (): Promise<void> => {
    if (ambientAudioSourceRef.current) {
      await ambientAudioContextRef.current?.resume();
      return;
    }
    if (ambientAudioLoadingRef.current) {
      await ambientAudioLoadingRef.current;
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = soundEnabledRef.current ? settings.live.audio.ambientVolume : 0;
    gain.connect(context.destination);
    ambientAudioContextRef.current = context;
    ambientAudioGainRef.current = gain;
    soundSynthRef.current.setContext(context);
    soundSynthRef.current.setEnabled(soundEnabledRef.current);
    soundSynthRef.current.setMasterVolume(settings.live.audio.effectsVolume);
    soundSynthRef.current.setDropVolume(settings.live.audio.dropVolume);
    soundSynthRef.current.setRippleVolume(settings.live.audio.rippleVolume);
    soundSynthRef.current.setDipVolume(settings.live.audio.dipVolume);
    soundSynthRef.current.setSplashVolume(settings.live.audio.splashVolume);

    const loading = (async (): Promise<void> => {
      await context.resume();
      const loadBuffer = async (path: string): Promise<AudioBuffer> => {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
        if (!response.ok) throw new Error(`Unable to load ${path}`);
        return context.decodeAudioData(await response.arrayBuffer());
      };
      const ambientBuffer = await loadBuffer(AUDIO.ambient.source);
      if (context.state === "closed") return;

      const ambientSource = context.createBufferSource();
      ambientSource.buffer = ambientBuffer;
      ambientSource.loop = true;
      ambientSource.connect(gain);
      ambientSource.start();
      ambientAudioSourceRef.current = ambientSource;
    })();
    ambientAudioLoadingRef.current = loading;
    try {
      await loading;
    } finally {
      ambientAudioLoadingRef.current = null;
    }
  }, []);

  const playSoundEffect = useCallback(
    (action: (synth: SoundSynthesizer) => void) => {
      if (!soundEnabledRef.current) return;
      if (!ambientAudioContextRef.current) {
        void startAmbientAudio().then(() => {
          action(soundSynthRef.current);
        });
        return;
      }
      if (ambientAudioContextRef.current.state === "suspended") {
        void ambientAudioContextRef.current.resume().then(() => {
          action(soundSynthRef.current);
        });
        return;
      }
      action(soundSynthRef.current);
    },
    [startAmbientAudio],
  );

  const scatter = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.scatter();
    playSoundEffect((synth) => synth.playWaterSplash());
    setStats(sceneStats(runtime));
  }, [playSoundEffect]);

  const setFamilyPreview = useCallback((index: number | null) => {
    previewFamilyRef.current = index;
    setPreviewFamily(index);
    runtimeRef.current?.renderer.setPreviewFamily(index);
  }, []);

  // Clears the family preview on any settings edit that doesn't keep it
  // (koi-palettes/koi-patterns edits and a few koi body/eye fields do).
  useEffect(() => {
    return settings.subscribe((batch) => {
      if (previewFamilyRef.current === null) return;
      if (batch.some((change) => !change.keepsFamilyPreview)) setFamilyPreview(null);
    });
  }, [setFamilyPreview]);

  // Keeps the koi count readout in sync after a koi:count effect runs
  // (settings/effects.ts calls school.setCount on the next animation frame).
  useEffect(() => {
    return settings.subscribe((batch) => {
      if (!batch.some((change) => change.effect === "koi:count")) return;
      requestAnimationFrame(() => {
        const runtime = runtimeRef.current;
        if (runtime) setStats(sceneStats(runtime));
      });
    });
  }, []);

  const changeKoiCount = useCallback((amount: number) => {
    const current = runtimeRef.current?.school.count ?? settings.live.koi.initialCount;
    settings.set(["koi", "initialCount"], clamp(current + amount, 1, 48));
  }, []);

  const minusHold = useHoldToRepeat(() => changeKoiCount(-1), stats.koi <= 1);
  const plusHold = useHoldToRepeat(() => changeKoiCount(1), stats.koi >= 48);

  const setAmbientModeState = useCallback((active: boolean) => {
    ambientModeRef.current = active;
    setAmbientMode(active);
    setAmbientControlsVisible(true);
    if (!active) {
      setScreensaverActive(false);
    }
  }, []);

  const toggleAmbientMode = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (ambientModeRef.current) {
      setAmbientModeState(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    setAmbientModeState(true);
    const fullscreenRoot = document.documentElement;
    if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
      await fullscreenRoot.requestFullscreen().catch(() => undefined);
    }
  }, [setAmbientModeState]);

  // Keeps the renderer's weather look and the simulation's rain intensity in
  // sync with the store, whether they change via a slider, Undo, or reload.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.renderer.setWeatherPreset(weatherPreset);
  }, [weatherPreset]);
  useEffect(() => {
    const intensity = rainEnabled ? 1 : 0;
    runtimeRef.current?.school.setRainIntensity(intensity);
    runtimeRef.current?.renderer.setRainIntensity(intensity);
  }, [rainEnabled]);

  const setAmbientSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    soundSynthRef.current.setEnabled(enabled);
    if (enabled) void startAmbientAudio().catch(() => undefined);

    const context = ambientAudioContextRef.current;
    const gain = ambientAudioGainRef.current;
    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(
        enabled ? settings.live.audio.ambientVolume : 0,
        now + AUDIO.toggleFadeSeconds,
      );
    }
  }, [startAmbientAudio]);

  useEffect(() => {
    return settings.subscribe((batch) => {
      if (!batch.some((change) => change.path[0] === "audio")) return;
      const audio = settings.live.audio;
      const context = ambientAudioContextRef.current;
      const gain = ambientAudioGainRef.current;
      if (context && gain && soundEnabledRef.current) {
        const now = context.currentTime;
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.linearRampToValueAtTime(audio.ambientVolume, now + 0.05);
      }
      soundSynthRef.current.setMasterVolume(audio.effectsVolume);
      soundSynthRef.current.setDropVolume(audio.dropVolume);
      soundSynthRef.current.setRippleVolume(audio.rippleVolume);
      soundSynthRef.current.setDipVolume(audio.dipVolume);
      soundSynthRef.current.setSplashVolume(audio.splashVolume);
    });
  }, []);

  const undoLastInteraction = useCallback(() => {
    settings.undo();
  }, []);

  const resetSection = useCallback((sectionIds: readonly SectionId[]) => {
    settings.resetSections(sectionIds);
    if (previewFamilyRef.current !== null && sectionIds.some((id) => id !== "koi-palettes" && id !== "koi-patterns")) {
      setFamilyPreview(null);
    }
  }, [setFamilyPreview]);

  const resetSettings = useCallback(() => {
    settings.resetAll();
    setFamilyPreview(null);
    setConfirmResetAll(false);
  }, [setFamilyPreview]);

  const changeFamily = useCallback((index: number) => {
    setSelectedFamily(index);
    setFamilyPreview(index);
  }, [setFamilyPreview]);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setFamilyPreview(null);
      setConfirmResetAll(false);
    }
    setSettingsOpen(open);
  }, [setFamilyPreview]);

  useEffect(() => {
    const unlockAmbientAudio = (): void => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
      if (soundEnabledRef.current) {
        void startAmbientAudio().catch(() => undefined);
      }
    };

    window.addEventListener("pointerdown", unlockAmbientAudio);
    window.addEventListener("keydown", unlockAmbientAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
    };
  }, [startAmbientAudio]);

  useEffect(() => () => {
    soundSynthRef.current.dispose();
    ambientAudioSourceRef.current?.stop();
    ambientAudioSourceRef.current = null;
    ambientAudioGainRef.current = null;
    const context = ambientAudioContextRef.current;
    ambientAudioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const changeWeather = useCallback((id: WeatherPresetId) => {
    setFamilyPreview(null);
    settings.setWeather(id);
    setWeatherMenuOpen(false);
  }, [setFamilyPreview]);

  const handleRainChange = useCallback((enabled: boolean) => {
    settings.setRain(enabled);
  }, []);

  const handleSoundChange = useCallback((enabled: boolean) => {
    setAmbientSoundEnabled(enabled);
  }, [setAmbientSoundEnabled]);

  const resetAtmosphere = useCallback(() => {
    changeWeather(DEFAULT_WEATHER_PRESET_ID);
    setAmbientSoundEnabled(false);
    resetSection(["audio"]);
  }, [changeWeather, resetSection, setAmbientSoundEnabled]);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      if (document.fullscreenElement === document.documentElement) {
        setAmbientModeState(true);
      } else if (ambientModeRef.current && !document.fullscreenElement) {
        setAmbientModeState(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [setAmbientModeState]);

  useEffect(() => {
    if (!ambientMode || settingsOpen || weatherMenuOpen) {
      setAmbientControlsVisible(true);
      setScreensaverActive(false);
      return;
    }

    let idleTimer: number | null = window.setTimeout(() => {
      if (!dockRef.current?.contains(document.activeElement)) {
        setAmbientControlsVisible(false);
      }
    }, AMBIENT_IDLE_DELAY_MS);

    let screensaverTimer: number | null = window.setTimeout(() => {
      setScreensaverActive(true);
    }, SCREENSAVER_IDLE_DELAY_MS);

    const resetIdleTimers = (): void => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (screensaverTimer !== null) window.clearTimeout(screensaverTimer);

      idleTimer = window.setTimeout(() => {
        if (!dockRef.current?.contains(document.activeElement)) {
          setAmbientControlsVisible(false);
        }
      }, AMBIENT_IDLE_DELAY_MS);

      screensaverTimer = window.setTimeout(() => {
        setScreensaverActive(true);
      }, SCREENSAVER_IDLE_DELAY_MS);
    };

    const handleUserActivity = (): void => {
      setAmbientControlsVisible(true);
      setScreensaverActive(false);
      resetIdleTimers();
    };

    const handleFocusIn = (event: FocusEvent): void => {
      setAmbientControlsVisible(true);
      setScreensaverActive(false);
      if (dockRef.current?.contains(event.target as Node)) {
        if (idleTimer !== null) window.clearTimeout(idleTimer);
        if (screensaverTimer !== null) window.clearTimeout(screensaverTimer);
      } else {
        resetIdleTimers();
      }
    };

    const handleFocusOut = (event: FocusEvent): void => {
      if (!dockRef.current?.contains(event.relatedTarget as Node)) {
        resetIdleTimers();
      }
    };

    window.addEventListener("pointermove", handleUserActivity);
    window.addEventListener("pointerdown", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    return () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (screensaverTimer !== null) window.clearTimeout(screensaverTimer);
      window.removeEventListener("pointermove", handleUserActivity);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, [ambientMode, settingsOpen, weatherMenuOpen]);

  useEffect(() => {
    if (!showInterface) {
      if (previewFamilyRef.current !== null) setFamilyPreview(null);
      setSettingsOpen(false);
      setWeatherMenuOpen(false);
    }
  }, [showInterface, setFamilyPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const display = displayRef.current;
    if (!canvas || !display) return;
    const initialSize = pondRenderSize(display);
    setCanvasSize(initialSize.width, initialSize.height);
    const school = new School();
    const renderer = new FishRenderer(canvas);
    const runtime: PondRuntime = { school, renderer, showDebug: false };
    runtimeRef.current = runtime;
    const activeWeather = getWeatherPreset(settings.meta().weather);
    renderer.setWeatherPreset(activeWeather.id);
    const initialRain = settings.meta().rain ? 1 : 0;
    school.setRainIntensity(initialRain);
    renderer.setRainIntensity(initialRain);
    const disconnectEffects = connectSettingsEffects(settings, { school, renderer });

    const resizeObserver = new ResizeObserver(() => {
      const nextSize = pondRenderSize(display);
      if (nextSize.width === CANVAS_WIDTH && nextSize.height === CANVAS_HEIGHT) return;
      const oldWidth = CANVAS_WIDTH;
      const oldHeight = CANVAS_HEIGHT;
      setCanvasSize(nextSize.width, nextSize.height);
      school.resize(nextSize.width / oldWidth, nextSize.height / oldHeight);
      renderer.resize(nextSize.width, nextSize.height, oldWidth, oldHeight);
    });
    resizeObserver.observe(display);

    let animationFrame = 0;
    let accumulator = 0;
    let simulationTime = 0;
    let previousTime = performance.now();
    let frameCount = 0;
    let lastMetricsUpdateTime = performance.now();
    const animate = (now: number): void => {
      accumulator += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      while (accumulator >= FIXED_STEP) {
        simulationTime += FIXED_STEP;
        school.update(FIXED_STEP, simulationTime);
        accumulator -= FIXED_STEP;
      }

      renderer.draw(school, simulationTime, runtime.showDebug);

      frameCount += 1;
      if (now - lastMetricsUpdateTime >= 350) {
        const elapsed = now - lastMetricsUpdateTime;
        const currentFps = Math.round((frameCount * 1000) / elapsed);
        const currentFrameTime = +(elapsed / frameCount).toFixed(1);
        frameCount = 0;
        lastMetricsUpdateTime = now;
        if (debugHudOpenRef.current) {
          const dpr = window.devicePixelRatio || 1;
          setMetrics({
            fps: currentFps,
            frameTimeMs: currentFrameTime,
            resolution: `${Math.round(window.innerWidth * dpr)}×${Math.round(window.innerHeight * dpr)} (@${dpr.toFixed(1)}x)`,
            koiCount: school.fish.length,
            minnowCount: school.tinyFish.fish.length,
          });
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          scatter();
          break;
        case "BracketLeft":
          changeKoiCount(-1);
          break;
        case "BracketRight":
          changeKoiCount(1);
          break;
        case "KeyD":
          setDebugHudOpen((current) => {
            const next = !current;
            debugHudOpenRef.current = next;
            runtime.showDebug = next;
            return next;
          });
          break;
        case "KeyH":
          setShowInterface((current) => !current);
          break;
        case "KeyR":
          school.reset();
          break;
        case "KeyF":
          event.preventDefault();
          void toggleAmbientMode();
          break;
        default:
          return;
      }
      setStats(sceneStats(runtime));
    };

    window.addEventListener("keydown", handleKeyDown);
    setStats(sceneStats(runtime));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      disconnectEffects();
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      renderer.dispose();
      runtimeRef.current = null;
    };
  }, [changeKoiCount, toggleAmbientMode]);

  const getPondCoords = (event: ReactPointerEvent<HTMLCanvasElement>): Vec2 => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return vec(
      clamp(
        ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
        0,
        CANVAS_WIDTH,
      ),
      clamp(
        ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
        0,
        CANVAS_HEIGHT,
      ),
    );
  };

  const handlePondPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const point = getPondCoords(event);
    isPointerDownRef.current = true;
    lastPointerPosRef.current = point;
    lastRipplePosRef.current = point;

    // Check if pointer hit an interactive lotus leaf to grab
    const grabResult = runtime.renderer.startGrabLotus(point);
    if (grabResult) {
      isDraggingLotusRef.current = true;
      activeLeafIndexRef.current = grabResult.leafIndex;
      lastLotusAudioPosRef.current = point;
      event.currentTarget.style.cursor = "grabbing";
      runtime.school.ripples.trigger("touch", point);
      playSoundEffect((synth) => synth.playWaterDip());
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture unsupported or failed
      }
    } else {
      isDraggingLotusRef.current = false;
      activeLeafIndexRef.current = null;
      lastLotusAudioPosRef.current = null;
      runtime.school.callTo(point);
      playSoundEffect((synth) => synth.playWaterDrop());
      setStats(sceneStats(runtime));
    }
  };

  const handlePondPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const point = getPondCoords(event);

    if (isPointerDownRef.current) {
      if (isDraggingLotusRef.current) {
        runtime.renderer.updateGrabLotus(point);
        event.currentTarget.style.cursor = "grabbing";
        const lastAudioPos = lastLotusAudioPosRef.current;
        const distSinceAudio = lastAudioPos
          ? Math.hypot(point.x - lastAudioPos.x, point.y - lastAudioPos.y)
          : 999;
        if (distSinceAudio > 50) {
          playSoundEffect((synth) => synth.playWaterRipple({ volume: 0.12 }));
          lastLotusAudioPosRef.current = point;
        }
      } else if (lastPointerPosRef.current) {
        const dx = point.x - lastPointerPosRef.current.x;
        const dy = point.y - lastPointerPosRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist >= 1.2) {
          const lastRipple = lastRipplePosRef.current;
          const distSinceRipple = lastRipple
            ? Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y)
            : 999;
          if (distSinceRipple > 34) {
            runtime.school.callTo(point);
            playSoundEffect((synth) =>
              synth.playWaterRipple({ volume: 0.14, pitchMultiplier: 1.05 }),
            );
            lastRipplePosRef.current = point;
          }
          lastPointerPosRef.current = point;
        }
      }
    } else if (event.pointerType === "mouse") {
      const isOverLotus = runtime.renderer.hitTestLotus(point);
      event.currentTarget.style.cursor = isOverLotus ? "grab" : "crosshair";
    }
  };

  const handlePondPointerUp = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    const runtime = runtimeRef.current;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    }

    if (isDraggingLotusRef.current && runtime) {
      const point = getPondCoords(event);
      const endResult = runtime.renderer.endGrabLotus(point);
      if (endResult) {
        if (endResult.wasDragged) {
          runtime.school.ripples.trigger("touch", point);
          playSoundEffect((synth) =>
            synth.playWaterSplash({ intensity: "gentle", volume: 0.14 }),
          );
          settings.set(["lotus-leaves", endResult.leafIndex, "x"], endResult.x, {
            interaction: `lotus-drag-${endResult.leafIndex}`,
          });
          settings.set(["lotus-leaves", endResult.leafIndex, "y"], endResult.y, {
            interaction: `lotus-drag-${endResult.leafIndex}`,
          });
        } else {
          playSoundEffect((synth) =>
            synth.playWaterDrop({ pitchMultiplier: 0.88 }),
          );
        }
      }
      const isOverLotus = runtime.renderer.hitTestLotus(point);
      event.currentTarget.style.cursor = isOverLotus ? "grab" : "crosshair";
    }

    isPointerDownRef.current = false;
    isDraggingLotusRef.current = false;
    lastPointerPosRef.current = null;
    lastRipplePosRef.current = null;
    lastLotusAudioPosRef.current = null;
    activeLeafIndexRef.current = null;
  };

  const handlePondPointerCancel = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    }
    runtimeRef.current?.renderer.cancelGrabLotus();
    isPointerDownRef.current = false;
    isDraggingLotusRef.current = false;
    lastPointerPosRef.current = null;
    lastRipplePosRef.current = null;
    lastLotusAudioPosRef.current = null;
    activeLeafIndexRef.current = null;
  };

  const handlePondPointerLeave = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): void => {
    if (!isPointerDownRef.current && event.pointerType === "mouse") {
      event.currentTarget.style.cursor = "crosshair";
    }
  };

  const revealHiddenInterfaceOnMobile = (
    event: ReactPointerEvent<HTMLElement>,
  ): void => {
    if (!isMobile || showInterface) return;
    event.preventDefault();
    event.stopPropagation();
    setShowInterface(true);
  };

  const selectedWeather = getWeatherPreset(weatherPreset);
  const ambientUiHeldOpen = settingsOpen || weatherMenuOpen;
  const ambientUiHidden =
    ambientMode && !ambientControlsVisible && !ambientUiHeldOpen;
  const uiHidden = !showInterface || ambientUiHidden;

  return (
    <main
      ref={stageRef}
      className={`stage${ambientMode ? " stage--ambient" : ""}${
        uiHidden
          ? " stage--ambient-idle"
          : ""
      }`}
      aria-label="Procedural koi simulation"
      onPointerDownCapture={revealHiddenInterfaceOnMobile}
    >
      <div className="pond-shell">
        <div className="display" ref={displayRef}>
          <canvas
            ref={canvasRef}
            id="pond"
            aria-label="Animated procedural koi"
            onPointerDown={handlePondPointerDown}
            onPointerMove={handlePondPointerMove}
            onPointerUp={handlePondPointerUp}
            onPointerLeave={handlePondPointerLeave}
            onPointerCancel={handlePondPointerCancel}
          />
          {previewFamily !== null && settingsOpen && (
            <div className="pond-preview-label" aria-live="polite">
              {settings.live["koi-palettes"][previewFamily]?.name ?? "Koi"} family preview
            </div>
          )}
          <ScreensaverClock
            active={
              !settingsOpen &&
              !weatherMenuOpen &&
              ((ambientMode && screensaverActive) ||
                (Boolean(displayWhenUiHidden) && uiHidden))
            }
          />
        </div>

        <div
          className={`pond-ui${
            uiHidden
              ? " pond-ui--hidden"
              : ""
          }`}
          aria-hidden={uiHidden}
        >
          <header className="brand-float">
            <h1 className="brand-wordmark">milesueee ∙ nagomi</h1>
          </header>

          {debugHudOpen && (
            <aside className="performance-hud" role="region" aria-label="Performance metrics">
              <div className="performance-hud__row">
                <span className="performance-hud__badge">
                  <span
                    className={`performance-hud__dot ${
                      metrics.fps >= 58
                        ? "performance-hud__dot--good"
                        : metrics.fps >= 30
                        ? "performance-hud__dot--ok"
                        : "performance-hud__dot--bad"
                    }`}
                  />
                  <span className="performance-hud__fps">{metrics.fps} FPS</span>
                </span>
                <span className="performance-hud__sub">{metrics.frameTimeMs} ms</span>
              </div>
              <div className="performance-hud__divider" />
              <div className="performance-hud__meta">
                <span>{metrics.resolution}</span>
                <span>{metrics.koiCount} koi · {metrics.minnowCount} minnows</span>
              </div>
            </aside>
          )}

            <div className="top-actions">
              <GitHubStars repo={GITHUB_REPOSITORY} />
              <Separator orientation="vertical" />
              <Drawer
                open={settingsOpen}
                onOpenChange={handleSettingsOpenChange}
                modal={false}
                swipeDirection={isMobile ? "down" : "right"}
                showSwipeHandle={isMobile}
                disablePointerDismissal
              >
              <DrawerTrigger
                render={
                  <Button
                    className="settings-trigger"
                    variant="ghost"
                    aria-label="Open pond settings"
                  />
                }
              >
                <Settings2 aria-hidden="true" />
                <span>Settings</span>
              </DrawerTrigger>
              <DrawerContent className="settings-drawer">
                <DrawerHeader className="settings-drawer__header">
                  <div>
                    <DrawerTitle>Pond settings</DrawerTitle>
                    <DrawerDescription>
                      Changes preview in the pond and save on this device.
                    </DrawerDescription>
                  </div>
                  <DrawerClose
                    render={
                      <Button variant="ghost" size="icon" aria-label="Close settings" />
                    }
                  >
                    <X aria-hidden="true" />
                  </DrawerClose>
                </DrawerHeader>
                <div className="settings-scroll">
                  <ConfigEditor
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    weather={weatherPreset}
                    rainEnabled={rainEnabled}
                    soundEnabled={soundEnabled}
                    onWeatherChange={changeWeather}
                    onRainChange={handleRainChange}
                    onSoundChange={handleSoundChange}
                    onResetSection={resetSection}
                    onResetAtmosphere={resetAtmosphere}
                    selectedFamily={selectedFamily}
                    previewFamily={previewFamily}
                    onFamilyChange={changeFamily}
                    onPreviewFamilyChange={setFamilyPreview}
                    debugHudOpen={debugHudOpen}
                    onDebugHudChange={(open) => {
                      setDebugHudOpen(open);
                      debugHudOpenRef.current = open;
                      if (runtimeRef.current) runtimeRef.current.showDebug = open;
                    }}
                  />
                </div>
                <DrawerFooter className="settings-drawer__footer">
                  {confirmResetAll ? (
                    <div className="settings-reset-confirm" role="group" aria-label="Confirm reset all settings">
                      <span>Reset all settings on this device?</span>
                      <Button variant="ghost" onClick={() => setConfirmResetAll(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={resetSettings}>Reset all</Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={undoLastInteraction} disabled={!canUndo}>
                        <Undo2 aria-hidden="true" /> Undo
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmResetAll(true)}>
                        <RotateCcw aria-hidden="true" /> Reset all
                      </Button>
                      <DrawerClose render={<Button />}>Done</DrawerClose>
                    </>
                  )}
                </DrawerFooter>
              </DrawerContent>
              </Drawer>
            </div>
          </div>

        <nav
          ref={dockRef}
          className={`control-dock${
            uiHidden
              ? " control-dock--hidden"
              : ""
          }`}
          aria-label="Simulation controls"
          aria-hidden={uiHidden}
        >
            <div className="control-group control-group--view">
              <Tooltip disabled={isMobile}>
                <TooltipTrigger
                  render={
                    <Button
                      className="control-button--ambient"
                      variant="ghost"
                      size="sm"
                      onClick={() => void toggleAmbientMode()}
                      aria-label={ambientMode ? "Exit ambient mode" : "Enter ambient mode"}
                      aria-keyshortcuts="F"
                      aria-pressed={ambientMode}
                    />
                  }
                >
                  {ambientMode ? (
                    <Minimize2 aria-hidden="true" />
                  ) : (
                    <Maximize2 aria-hidden="true" />
                  )}
                  <span className="control-label">{ambientMode ? "Exit" : "Ambient"}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {ambientMode ? "Exit ambient mode (F)" : "Enter ambient mode (F)"}
                </TooltipContent>
              </Tooltip>

              <Tooltip disabled={isMobile}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInterface(false)}
                      aria-label="Hide interface"
                      aria-keyshortcuts="H"
                    />
                  }
                >
                  <EyeOff aria-hidden="true" />
                  <span className="control-label">Hide UI</span>
                </TooltipTrigger>
                <TooltipContent>Hide interface (H)</TooltipContent>
              </Tooltip>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--simulation">
              <Tooltip disabled={isMobile}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={scatter}
                      aria-keyshortcuts="Space"
                    />
                  }
                >
                  <Shuffle aria-hidden="true" />
                  <span className="control-label">Scatter</span>
                </TooltipTrigger>
                <TooltipContent>Scatter koi (Space)</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" />
              <div className="koi-stepper">
                <Tooltip disabled={isMobile}>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={stats.koi <= 1}
                        aria-label="Remove one koi"
                        aria-keyshortcuts="["
                        {...minusHold}
                      />
                    }
                  >
                    <Minus aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Remove koi ([)</TooltipContent>
                </Tooltip>
                <Tooltip disabled={isMobile}>
                  <TooltipTrigger
                    render={
                      <div
                        className="koi-count-badge"
                        tabIndex={0}
                        role="status"
                        aria-label={`Koi count: ${stats.koi}`}
                      />
                    }
                  >
                    <Fish aria-hidden="true" className="koi-count-badge__icon" />
                    <output className="koi-count" aria-live="polite">
                      {stats.koi}
                    </output>
                  </TooltipTrigger>
                  <TooltipContent>Koi count</TooltipContent>
                </Tooltip>
                <Tooltip disabled={isMobile}>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={stats.koi >= 48}
                        aria-label="Add one koi"
                        aria-keyshortcuts="]"
                        {...plusHold}
                      />
                    }
                  >
                    <Plus aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Add koi (])</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--environment">
              <DropdownMenu
                open={weatherMenuOpen}
                onOpenChange={setWeatherMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="weather-trigger"
                      variant="ghost"
                      size="sm"
                      aria-label={`Weather: ${selectedWeather.label}`}
                    />
                  }
                >
                  <WeatherIcon id={weatherPreset} />
                  <span className="control-label">{selectedWeather.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="weather-menu"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <DropdownMenuRadioGroup
                    value={weatherPreset}
                    onValueChange={(value) =>
                      changeWeather(value as WeatherPresetId)
                    }
                  >
                    <DropdownMenuLabel>Weather and lighting</DropdownMenuLabel>
                    {WEATHER_PRESETS.map((preset) => (
                      <DropdownMenuRadioItem
                        key={preset.id}
                        value={preset.id}
                        closeOnClick
                      >
                        <WeatherIcon id={preset.id} />
                        {preset.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <label className="toggle-control">
                {rainEnabled ? (
                  <CloudRain aria-hidden="true" className="toggle-control__icon toggle-control__icon--active" />
                ) : (
                  <CloudRain aria-hidden="true" className="toggle-control__icon toggle-control__icon--muted" />
                )}
                <span className="control-label">Rain</span>
                <Switch
                  size="sm"
                  checked={rainEnabled}
                  onCheckedChange={handleRainChange}
                  aria-label="Toggle rain"
                />
              </label>
              <label className="toggle-control">
                {soundEnabled ? (
                  <Volume2 aria-hidden="true" className="toggle-control__icon toggle-control__icon--active" />
                ) : (
                  <VolumeX aria-hidden="true" className="toggle-control__icon toggle-control__icon--muted" />
                )}
                <span className="control-label">Sound</span>
                <Switch
                  size="sm"
                  checked={soundEnabled}
                  onCheckedChange={handleSoundChange}
                  aria-label="Toggle pond ambience"
                />
              </label>
            </div>
          </nav>
      </div>
    </main>
  );
}
