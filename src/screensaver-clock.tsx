import { useEffect, useMemo, useState } from "react";
import { useSetting, useSettingsMeta } from "./settings/react";
import type { WeatherPresetId } from "./weather";

interface ScreensaverClockProps {
  active: boolean;
}

// Each weather preset's mood color, as raw RGB (0-255) plus the alpha to use
// for each element. Auto mode blends this toward the pond's actual
// shallowColor (see blendWithPond below) so the clock still matches the
// weather's lighting character, while tracking whatever palette the pond
// is actually using instead of a hardcoded look tied only to the preset name.
const WEATHER_CLOCK_ACCENTS: Record<
  WeatherPresetId,
  {
    textRgb: readonly [number, number, number];
    textAlpha: number;
    dateRgb: readonly [number, number, number];
    dateAlpha: number;
    glowRgb: readonly [number, number, number];
    glowAlpha: number;
  }
> = {
  sunny: {
    textRgb: [255, 250, 235],
    textAlpha: 0.98,
    dateRgb: [255, 243, 210],
    dateAlpha: 0.9,
    glowRgb: [255, 190, 60],
    glowAlpha: 0.5,
  },
  sunset: {
    textRgb: [255, 232, 216],
    textAlpha: 0.98,
    dateRgb: [255, 206, 182],
    dateAlpha: 0.92,
    glowRgb: [255, 105, 40],
    glowAlpha: 0.55,
  },
  moonlight: {
    textRgb: [215, 236, 255],
    textAlpha: 0.98,
    dateRgb: [185, 218, 255],
    dateAlpha: 0.9,
    glowRgb: [60, 135, 255],
    glowAlpha: 0.55,
  },
  mist: {
    textRgb: [220, 248, 240],
    textAlpha: 0.98,
    dateRgb: [195, 240, 225],
    dateAlpha: 0.9,
    glowRgb: [50, 200, 160],
    glowAlpha: 0.5,
  },
  "deep-clear": {
    textRgb: [215, 252, 245],
    textAlpha: 0.98,
    dateRgb: [180, 245, 235],
    dateAlpha: 0.9,
    glowRgb: [30, 215, 185],
    glowAlpha: 0.55,
  },
  overcast: {
    textRgb: [235, 244, 250],
    textAlpha: 0.98,
    dateRgb: [210, 228, 240],
    dateAlpha: 0.88,
    glowRgb: [120, 165, 195],
    glowAlpha: 0.45,
  },
  rain: {
    textRgb: [220, 238, 250],
    textAlpha: 0.98,
    dateRgb: [195, 222, 242],
    dateAlpha: 0.88,
    glowRgb: [80, 160, 220],
    glowAlpha: 0.5,
  },
};

// How strongly auto mode leans on the pond's real color vs. the weather
// preset's stock mood color. 0 = ignore the pond entirely (old behavior),
// 1 = fully match the pond (same as colorMode "pond"). The glow uses a
// lower blend so the weather's lighting character (warm sunset glow, cool
// moonlight glow, etc.) stays recognizable even once the text hue has
// been pulled toward the pond's actual palette.
const AUTO_POND_BLEND = 0.5;
const AUTO_POND_GLOW_BLEND = 0.35;

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendWithPond(
  presetRgb: readonly [number, number, number],
  shallowColor: readonly [number, number, number] | undefined,
  blend: number,
): [number, number, number] {
  if (!shallowColor) return [...presetRgb];
  const pondRgb: [number, number, number] = [
    shallowColor[0] * 255,
    shallowColor[1] * 255,
    shallowColor[2] * 255,
  ];
  return [
    clampChannel(presetRgb[0] + (pondRgb[0] - presetRgb[0]) * blend),
    clampChannel(presetRgb[1] + (pondRgb[1] - presetRgb[1]) * blend),
    clampChannel(presetRgb[2] + (pondRgb[2] - presetRgb[2]) * blend),
  ];
}

function rgba(rgb: readonly [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function WeatherIcon({ weather }: { weather: WeatherPresetId }) {
  switch (weather) {
    case "sunny":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "sunset":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 3.5a4.5 4.5 0 0 0-4.5 4.5h9A4.5 4.5 0 0 0 8 3.5z" />
          <path d="M2 11h12M4 13.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "moonlight":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M12.5 9.5A5.5 5.5 0 0 1 6.5 3.5a5.5 5.5 0 1 0 6 6z" />
          <path d="M13 2.5l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z" />
        </svg>
      );
    case "rain":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path
            d="M4.5 9a2.5 2.5 0 0 1-.5-4.95A3.5 3.5 0 0 1 10.5 5a2.5 2.5 0 0 1 1 4.8"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M5.5 11l-1 2.5M8.5 11l-1 2.5M11.5 11l-1 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "mist":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M2.5 5h11M4 8h8M3 11h10M5.5 13.5h5" />
        </svg>
      );
    case "overcast":
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M4.5 11a3 3 0 0 1-.5-5.96A4 4 0 0 1 11.5 6.5a3 3 0 0 1 1 5.5H4.5z" />
        </svg>
      );
    case "deep-clear":
    default:
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 2l1.2 3.8L13 7l-3.8 1.2L8 12l-1.2-3.8L3 7l3.8-1.2z" />
          <circle cx="12.5" cy="3.5" r="1" />
        </svg>
      );
  }
}

export function ScreensaverClock({ active }: ScreensaverClockProps) {
  const [enabled] = useSetting<boolean>(["screensaver", "enabled"]);
  const [clockStyle] = useSetting<string>(["screensaver", "style"]);
  const [font] = useSetting<string>(["screensaver", "font"]);
  const [colorMode] = useSetting<string>(["screensaver", "colorMode"]);
  const [position] = useSetting<string>(["screensaver", "position"]);
  const [scale] = useSetting<number>(["screensaver", "scale"]);
  const [showSeconds] = useSetting<boolean>(["screensaver", "showSeconds"]);
  const [format24h] = useSetting<boolean>(["screensaver", "format24h"]);
  const [shallowColor] = useSetting<readonly [number, number, number]>([
    "pond-bed",
    "shallowColor",
  ]);
  const { weather } = useSettingsMeta();

  const [timeStr, setTimeStr] = useState("");
  const [longDateStr, setLongDateStr] = useState("");
  const [shortDateStr, setShortDateStr] = useState("");

  useEffect(() => {
    if (!enabled) return;

    const updateTime = () => {
      const now = new Date();
      const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: showSeconds ? "2-digit" : undefined,
        hour12: !format24h,
      });
      const longDateFormatter = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      setTimeStr(timeFormatter.format(now));
      setLongDateStr(longDateFormatter.format(now));
      setShortDateStr(shortDateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [enabled, showSeconds, format24h]);

  const accentColors = useMemo(() => {
    if (colorMode === "white") {
      return {
        text: "#ffffff",
        date: "rgba(255, 255, 255, 0.88)",
        glow: "rgba(0, 0, 0, 0.6)",
      };
    }
    if (colorMode === "pond" && shallowColor) {
      const r = Math.min(255, Math.round(200 + shallowColor[0] * 55));
      const g = Math.min(255, Math.round(200 + shallowColor[1] * 55));
      const b = Math.min(255, Math.round(200 + shallowColor[2] * 55));
      return {
        text: `rgba(${r}, ${g}, ${b}, 0.98)`,
        date: `rgba(${r}, ${g}, ${b}, 0.88)`,
        glow: `rgba(${Math.round(shallowColor[0] * 255)}, ${Math.round(
          shallowColor[1] * 255,
        )}, ${Math.round(shallowColor[2] * 255)}, 0.55)`,
      };
    }

    const preset = WEATHER_CLOCK_ACCENTS[weather] ?? WEATHER_CLOCK_ACCENTS.sunny;
    const textRgb = blendWithPond(preset.textRgb, shallowColor, AUTO_POND_BLEND);
    const dateRgb = blendWithPond(preset.dateRgb, shallowColor, AUTO_POND_BLEND);
    const glowRgb = blendWithPond(preset.glowRgb, shallowColor, AUTO_POND_GLOW_BLEND);

    return {
      text: rgba(textRgb, preset.textAlpha),
      date: rgba(dateRgb, preset.dateAlpha),
      glow: rgba(glowRgb, preset.glowAlpha),
    };
  }, [colorMode, weather, shallowColor]);

  if (!enabled) return null;

  const resolvedStyle = clockStyle || "pixel-hud";

  const fontClass =
    font === "dotgothic"
      ? "screensaver-clock--dotgothic"
      : font === "vt323"
      ? "screensaver-clock--vt323"
      : font === "silkscreen" || font === "pixel"
      ? "screensaver-clock--silkscreen"
      : font === "sans"
      ? "screensaver-clock--sans"
      : font === "serif"
      ? "screensaver-clock--serif"
      : font === "mono"
      ? "screensaver-clock--mono"
      : "screensaver-clock--silkscreen";

  const positionClass = `screensaver-clock--pos-${position || "bottom-right"}`;
  const styleClass = `screensaver-clock--style-${resolvedStyle}`;

  return (
    <aside
      className={`screensaver-clock ${styleClass} ${fontClass} ${positionClass} ${
        active ? "screensaver-clock--visible" : ""
      }`}
      style={
        {
          "--clock-scale": scale ?? 1,
          "--clock-color": accentColors.text,
          "--clock-date-color": accentColors.date,
          "--clock-glow": accentColors.glow,
        } as React.CSSProperties
      }
      role="timer"
      aria-label="Screensaver clock"
      aria-hidden={!active}
    >
      <div className="screensaver-clock__container">
        {resolvedStyle === "zen-pill" ? (
          <div className="screensaver-clock__pill-content">
            <span className="screensaver-clock__icon">
              <WeatherIcon weather={weather} />
            </span>
            <span className="screensaver-clock__date">{shortDateStr}</span>
            <span className="screensaver-clock__divider" aria-hidden="true">
              ·
            </span>
            <span className="screensaver-clock__time">{timeStr}</span>
          </div>
        ) : resolvedStyle === "compact-card" ? (
          <div className="screensaver-clock__card-content">
            <div className="screensaver-clock__header-row">
              <span className="screensaver-clock__icon">
                <WeatherIcon weather={weather} />
              </span>
              <span className="screensaver-clock__date">{longDateStr}</span>
            </div>
            <div className="screensaver-clock__time">{timeStr}</div>
          </div>
        ) : (
          /* "pixel-hud" (default cozy retro game HUD) */
          <div className="screensaver-clock__hud-content">
            <div className="screensaver-clock__header-row">
              <span className="screensaver-clock__icon">
                <WeatherIcon weather={weather} />
              </span>
              <span className="screensaver-clock__date">{shortDateStr}</span>
            </div>
            <div className="screensaver-clock__time">{timeStr}</div>
          </div>
        )}
      </div>
    </aside>
  );
}