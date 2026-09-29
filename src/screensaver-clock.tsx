import { useEffect, useState } from "react";
import { useSetting } from "./settings/react";

interface ScreensaverClockProps {
  active: boolean;
}

export function ScreensaverClock({ active }: ScreensaverClockProps) {
  const [enabled] = useSetting<boolean>(["screensaver", "enabled"]);
  const [font] = useSetting<string>(["screensaver", "font"]);
  const [position] = useSetting<string>(["screensaver", "position"]);
  const [scale] = useSetting<number>(["screensaver", "scale"]);
  const [showSeconds] = useSetting<boolean>(["screensaver", "showSeconds"]);
  const [format24h] = useSetting<boolean>(["screensaver", "format24h"]);

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

  if (!enabled) return null;

  const fontClass =
    font === "sans"
      ? "screensaver-clock--sans"
      : font === "mono"
      ? "screensaver-clock--mono"
      : "screensaver-clock--serif";

  const positionClass = `screensaver-clock--pos-${position || "center"}`;

  return (
    <aside
      className={`screensaver-clock ${fontClass} ${positionClass} ${
        active ? "screensaver-clock--visible" : ""
      }`}
      style={
        {
          "--clock-scale": scale ?? 1,
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
