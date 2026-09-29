import { useEffect, useMemo, useState } from "react";
import { useSetting, useSettingsMeta } from "./settings/react";
import type { WeatherPresetId } from "./weather";

interface ScreensaverClockProps {
  active: boolean;
}

const WEATHER_CLOCK_ACCENTS: Record<
  WeatherPresetId,
  { text: string; date: string; glow: string }
> = {
  sunny: {
    text: "rgba(255, 250, 235, 0.98)",
    date: "rgba(255, 243, 210, 0.90)",
    glow: "rgba(255, 190, 60, 0.50)",
  },
  sunset: {
    text: "rgba(255, 232, 216, 0.98)",
    date: "rgba(255, 206, 182, 0.92)",
    glow: "rgba(255, 105, 40, 0.55)",
  },
  moonlight: {
    text: "rgba(215, 236, 255, 0.98)",
    date: "rgba(185, 218, 255, 0.90)",
    glow: "rgba(60, 135, 255, 0.55)",
  },
  mist: {
    text: "rgba(220, 248, 240, 0.98)",
    date: "rgba(195, 240, 225, 0.90)",
    glow: "rgba(50, 200, 160, 0.50)",
  },
  "deep-clear": {
    text: "rgba(215, 252, 245, 0.98)",
    date: "rgba(180, 245, 235, 0.90)",
    glow: "rgba(30, 215, 185, 0.55)",
  },
  overcast: {
    text: "rgba(235, 244, 250, 0.98)",
    date: "rgba(210, 228, 240, 0.88)",
    glow: "rgba(120, 165, 195, 0.45)",
  },
  rain: {
    text: "rgba(220, 238, 250, 0.98)",
    date: "rgba(195, 222, 242, 0.88)",
    glow: "rgba(80, 160, 220, 0.50)",
  },
};

export function ScreensaverClock({ active }: ScreensaverClockProps) {
  const [enabled] = useSetting<boolean>(["screensaver", "enabled"]);
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
  const [dateStr, setDateStr] = useState("");

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
      const dateFormatter = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      setTimeStr(timeFormatter.format(now));
      setDateStr(dateFormatter.format(now));
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
    return WEATHER_CLOCK_ACCENTS[weather] ?? WEATHER_CLOCK_ACCENTS.sunny;
  }, [colorMode, weather, shallowColor]);

  if (!enabled) return null;

  const fontClass =
    font === "pixel"
      ? "screensaver-clock--pixel"
      : font === "mono"
      ? "screensaver-clock--mono"
      : font === "serif"
      ? "screensaver-clock--serif"
      : "screensaver-clock--sans";

  const positionClass = `screensaver-clock--pos-${position || "center"}`;

  return (
    <aside
      className={`screensaver-clock ${fontClass} ${positionClass} ${
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
      <div className="screensaver-clock__date">{dateStr}</div>
      <div className="screensaver-clock__time">{timeStr}</div>
    </aside>
  );
}
