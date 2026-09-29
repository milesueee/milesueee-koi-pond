import * as THREE from "three";
import { RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsColorInput, SettingsSlider } from "./settings-controls";
import { useSetting } from "./settings/react";
import { settings } from "./settings/store";
import type { SectionId } from "./settings/definition";
import { WEATHER_PRESETS, type WeatherPresetId } from "./weather";

interface QuickSettingsProps {
  weather: WeatherPresetId;
  rainEnabled: boolean;
  soundEnabled: boolean;
  onWeatherChange: (id: WeatherPresetId) => void;
  onRainChange: (enabled: boolean) => void;
  onSoundChange: (enabled: boolean) => void;
  onResetSection: (sectionIds: readonly SectionId[]) => void;
  onResetAtmosphere: () => void;
  selectedFamily: number;
  previewFamily: number | null;
  onFamilyChange: (index: number) => void;
  onPreviewFamilyChange: (index: number | null) => void;
  debugHudOpen: boolean;
  onDebugHudChange: (open: boolean) => void;
}

const formatPercent = (v: number): string => `${Math.round(v * 100)}%`;

function SettingSlider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="quick-setting" data-base-ui-swipe-ignore>
      <div className="quick-setting__copy">
        <span className="quick-setting__label">{label}</span>
        <small>{description}</small>
      </div>
      <SettingsSlider
        label={label}
        aria-label={label}
        showLabel={false}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onChange}
        formatValue={formatValue}
        className="drawer-elastic-slider"
      />
    </div>
  );
}

function hexFromRgb(value: readonly [number, number, number]): string {
  return `#${new THREE.Color().setRGB(...value).getHexString(THREE.SRGBColorSpace)}`;
}

function hexFromInt(value: number): string {
  return `#${value.toString(16).padStart(6, "0").slice(-6)}`;
}

function QuickColor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="quick-color" data-base-ui-swipe-ignore>
      <Label htmlFor={id}>{label}</Label>
      <SettingsColorInput id={id} value={value} onChange={onChange} />
    </div>
  );
}

export function QuickSettings({
  weather,
  rainEnabled,
  soundEnabled,
  onWeatherChange,
  onRainChange,
  onSoundChange,
  onResetSection,
  onResetAtmosphere,
  selectedFamily,
  previewFamily,
  onFamilyChange,
  onPreviewFamilyChange,
  debugHudOpen,
  onDebugHudChange,
}: QuickSettingsProps) {
  const paletteIndex = selectedFamily;
  const palettes = settings.live["koi-palettes"];
  const selectedPalette = palettes[paletteIndex] ?? palettes[0];

  const [koiCount, setKoiCount] = useSetting<number>(["koi", "initialCount"]);
  const [base, setBase] = useSetting<number>(["koi-palettes", paletteIndex, "base"]);
  const [accent, setAccent] = useSetting<number>(["koi-palettes", paletteIndex, "accent"]);
  const [marking, setMarking] = useSetting<number>(["koi-palettes", paletteIndex, "marking"]);
  const [fin, setFin] = useSetting<number>(["koi-palettes", paletteIndex, "fin"]);

  const [deepColor, setDeepColor] = useSetting<readonly [number, number, number]>(["pond-bed", "deepColor"]);
  const [shallowColor, setShallowColor] = useSetting<readonly [number, number, number]>(["pond-bed", "shallowColor"]);
  const [clarity, setClarity] = useSetting<number>(["water", "clarity"]);

  const [visibleLeafCount, setVisibleLeafCount] = useSetting<number>(["lotus", "visibleLeafCount"]);
  const [visibleFlowerCount, setVisibleFlowerCount] = useSetting<number>(["lotus", "visibleFlowerCount"]);
  const [visiblePatchCount, setVisiblePatchCount] = useSetting<number>(["duckweed", "visiblePatchCount"]);
  const [visibleButterflyCount, setVisibleButterflyCount] = useSetting<number>(["butterflies", "visibleCount"]);

  const [ambientVolume, setAmbientVolume] = useSetting<number>(["audio", "ambientVolume"]);
  const [effectsVolume, setEffectsVolume] = useSetting<number>(["audio", "effectsVolume"]);
  const [dropVolume, setDropVolume] = useSetting<number>(["audio", "dropVolume"]);
  const [rippleVolume, setRippleVolume] = useSetting<number>(["audio", "rippleVolume"]);
  const [dipVolume, setDipVolume] = useSetting<number>(["audio", "dipVolume"]);
  const [splashVolume, setSplashVolume] = useSetting<number>(["audio", "splashVolume"]);

  const [screensaverEnabled, setScreensaverEnabled] = useSetting<boolean>(["screensaver", "enabled"]);
  const [clockFont, setClockFont] = useSetting<string>(["screensaver", "font"]);
  const [clockPosition, setClockPosition] = useSetting<string>(["screensaver", "position"]);
  const [clockScale, setClockScale] = useSetting<number>(["screensaver", "scale"]);
  const [clockSeconds, setClockSeconds] = useSetting<boolean>(["screensaver", "showSeconds"]);
  const [clock24h, setClock24h] = useSetting<boolean>(["screensaver", "format24h"]);

  return (
    <div className="settings-quick">
      <section className="settings-quick__section" aria-labelledby="quick-koi-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row"><h3 id="quick-koi-heading">Koi</h3><button type="button" className="settings-section-reset" onClick={() => onResetSection(["koi", "koi-palettes", "koi-patterns"])}><RotateCcw aria-hidden="true" /> Reset</button></div>
          <p>Choose how many koi swim in the pond and color each koi family.</p>
        </div>
        <SettingSlider
          label="Koi count"
          description="Add or remove koi without restarting the pond."
          value={koiCount}
          min={1}
          max={48}
          onChange={setKoiCount}
        />
        <div className="quick-setting" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-koi-family">Koi family</Label>
            <small>The colors below change every koi of this pattern.</small>
          </div>
          <select
            id="quick-koi-family"
            className="quick-setting__select"
            value={paletteIndex}
            onChange={(event) => onFamilyChange(Number(event.target.value))}
          >
            {palettes.map((palette, index) => (
              <option key={palette.name} value={index}>{palette.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="family-preview-toggle"
          aria-pressed={previewFamily !== null}
          onClick={() => onPreviewFamilyChange(previewFamily === null ? paletteIndex : null)}
        >
          {previewFamily === null
            ? `Preview ${selectedPalette.name} family in the pond`
            : `Showing ${selectedPalette.name} family · Show all fish`}
        </button>
        <div className="quick-colors">
          <QuickColor id="quick-koi-base" label="Body" value={hexFromInt(base)} onChange={(hex) => setBase(Number.parseInt(hex.slice(1), 16))} />
          <QuickColor id="quick-koi-accent" label="Accent patches" value={hexFromInt(accent)} onChange={(hex) => setAccent(Number.parseInt(hex.slice(1), 16))} />
          <QuickColor id="quick-koi-marking" label="Dark markings" value={hexFromInt(marking)} onChange={(hex) => setMarking(Number.parseInt(hex.slice(1), 16))} />
          <QuickColor id="quick-koi-fin" label="Fins" value={hexFromInt(fin)} onChange={(hex) => setFin(Number.parseInt(hex.slice(1), 16))} />
        </div>
      </section>

      <section className="settings-quick__section" aria-labelledby="quick-water-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row"><h3 id="quick-water-heading">Water</h3><button type="button" className="settings-section-reset" onClick={() => onResetSection(["pond-bed", "water", "ripples"])}><RotateCcw aria-hidden="true" /> Reset</button></div>
          <p>Change the pond colors and how clearly the koi show through the surface.</p>
        </div>
        <div className="quick-colors">
          <QuickColor
            id="quick-deep-color"
            label="Deep water"
            value={hexFromRgb(deepColor)}
            onChange={(hex) => setDeepColor(new THREE.Color(hex).toArray().map((c) => Number(c.toFixed(4))) as [number, number, number])}
          />
          <QuickColor
            id="quick-shallow-color"
            label="Shallow water"
            value={hexFromRgb(shallowColor)}
            onChange={(hex) => setShallowColor(new THREE.Color(hex).toArray().map((c) => Number(c.toFixed(4))) as [number, number, number])}
          />
        </div>
        <SettingSlider
          label="Water clarity"
          description="Soften surface patterns to make the koi easier to see."
          value={clarity}
          min={0}
          max={1}
          step={0.01}
          onChange={setClarity}
        />
      </section>

      <section className="settings-quick__section" aria-labelledby="quick-plants-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row"><h3 id="quick-plants-heading">Plants &amp; life</h3><button type="button" className="settings-section-reset" onClick={() => onResetSection(["lotus", "lotus-leaves", "lotus-flowers", "duckweed", "duckweed-patches", "butterflies", "butterfly-spawns"])}><RotateCcw aria-hidden="true" /> Reset</button></div>
          <p>Fill the edges without changing the koi already swimming.</p>
        </div>
        <SettingSlider
          label="Lotus leaves"
          description="Add floating leaves around the pond."
          value={visibleLeafCount}
          min={0}
          max={32}
          onChange={setVisibleLeafCount}
        />
        <SettingSlider
          label="Lotus flowers"
          description="Place more flowers on the visible leaves."
          value={visibleFlowerCount}
          min={0}
          max={16}
          onChange={setVisibleFlowerCount}
        />
        <SettingSlider
          label="Duckweed patches"
          description="Add small clusters of floating greenery."
          value={visiblePatchCount}
          min={0}
          max={16}
          onChange={setVisiblePatchCount}
        />
        <SettingSlider
          label="Butterflies"
          description="Change how many butterflies visit the flowers."
          value={visibleButterflyCount}
          min={0}
          max={12}
          onChange={setVisibleButterflyCount}
        />
      </section>

      <section className="settings-quick__section" aria-labelledby="quick-atmosphere-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row"><h3 id="quick-atmosphere-heading">Atmosphere</h3><button type="button" className="settings-section-reset" onClick={onResetAtmosphere}><RotateCcw aria-hidden="true" /> Reset</button></div>
          <p>Choose the light, ripples, and background river sound.</p>
        </div>
        <div className="quick-setting" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-weather">Weather</Label>
            <small>A preset changes its own pond colors and lighting.</small>
          </div>
          <select
            id="quick-weather"
            className="quick-setting__select"
            value={weather}
            onChange={(event) => onWeatherChange(event.target.value as WeatherPresetId)}
          >
            {WEATHER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </div>
        <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-rain">Rain</Label>
            <small>Falling rain particles and surface ripples.</small>
          </div>
          <Switch id="quick-rain" checked={rainEnabled} onCheckedChange={onRainChange} />
        </div>
        <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-sound">River sound</Label>
            <small>Play the gentle background recording. Off by default.</small>
          </div>
          <Switch id="quick-sound" checked={soundEnabled} onCheckedChange={onSoundChange} />
        </div>
      </section>

      <section className="settings-quick__section" aria-labelledby="quick-display-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row">
            <h3 id="quick-display-heading">Display &amp; metrics</h3>
          </div>
          <p>Framerate HUD and fullscreen screensaver clock.</p>
        </div>
        <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-fps">Show FPS &amp; metrics HUD</Label>
            <small>Live overlay with FPS, frametime, resolution, and fish count. (Hotkey: D)</small>
          </div>
          <Switch id="quick-fps" checked={debugHudOpen} onCheckedChange={onDebugHudChange} />
        </div>
        <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
          <div className="quick-setting__copy">
            <Label htmlFor="quick-screensaver">Screensaver clock</Label>
            <small>Display time and date after 10s of inactivity in fullscreen.</small>
          </div>
          <Switch id="quick-screensaver" checked={screensaverEnabled} onCheckedChange={(checked) => setScreensaverEnabled(checked)} />
        </div>
        {screensaverEnabled && (
          <>
            <div className="quick-setting" data-base-ui-swipe-ignore>
              <div className="quick-setting__copy">
                <Label htmlFor="quick-clock-font">Clock font</Label>
                <small>Choose typographic style for time and date display.</small>
              </div>
              <select
                id="quick-clock-font"
                className="quick-setting__select"
                value={clockFont}
                onChange={(event) => setClockFont(event.target.value)}
              >
                <option value="serif">Editorial Serif (Cormorant Garamond)</option>
                <option value="sans">Inter Ultrathin (Modern Zen)</option>
                <option value="mono">Retro Monospace (Arcade)</option>
              </select>
            </div>
            <div className="quick-setting" data-base-ui-swipe-ignore>
              <div className="quick-setting__copy">
                <Label htmlFor="quick-clock-position">Position</Label>
                <small>Screen placement for the clock overlay.</small>
              </div>
              <select
                id="quick-clock-position"
                className="quick-setting__select"
                value={clockPosition}
                onChange={(event) => setClockPosition(event.target.value)}
              >
                <option value="center">Center</option>
                <option value="top-center">Top center</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </div>
            <SettingSlider
              label="Clock size"
              description="Scale multiplier for the screensaver time and date."
              value={clockScale}
              min={0.5}
              max={2}
              step={0.05}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={setClockScale}
            />
            <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
              <div className="quick-setting__copy">
                <Label htmlFor="quick-clock-seconds">Show seconds</Label>
                <small>Display live seconds in the clock.</small>
              </div>
              <Switch id="quick-clock-seconds" checked={clockSeconds} onCheckedChange={(checked) => setClockSeconds(checked)} />
            </div>
            <div className="quick-setting quick-setting--switch" data-base-ui-swipe-ignore>
              <div className="quick-setting__copy">
                <Label htmlFor="quick-clock-24h">24-hour format</Label>
                <small>Display time as 24-hour instead of 12-hour AM/PM.</small>
              </div>
              <Switch id="quick-clock-24h" checked={clock24h} onCheckedChange={(checked) => setClock24h(checked)} />
            </div>
          </>
        )}
      </section>

      <section className="settings-quick__section" aria-labelledby="quick-audio-heading">
        <div className="settings-quick__heading">
          <div className="settings-quick__heading-row">
            <h3 id="quick-audio-heading">Audio &amp; volume</h3>
            <button
              type="button"
              className="settings-section-reset"
              onClick={() => onResetSection(["audio"])}
            >
              <RotateCcw aria-hidden="true" /> Reset
            </button>
          </div>
          <p>Control the background river stream and interactive water sounds.</p>
        </div>
        <SettingSlider
          label="River recording volume"
          description="Loudness of the custom ambient river m4a audio stream."
          value={ambientVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setAmbientVolume}
        />
        <SettingSlider
          label="Sound effects master"
          description="Master volume for all interactive pond water sounds."
          value={effectsVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setEffectsVolume}
        />
        <SettingSlider
          label="Water drops"
          description="Volume of water drops on pond taps and clicks."
          value={dropVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setDropVolume}
        />
        <SettingSlider
          label="Water ripples"
          description="Volume of water lapping and surface ripple movement."
          value={rippleVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setRippleVolume}
        />
        <SettingSlider
          label="Lotus pad dips"
          description="Volume of submerged hollow gloops when pressing pads."
          value={dipVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setDipVolume}
        />
        <SettingSlider
          label="Water splashes"
          description="Volume of fish scattering and pad release splashes."
          value={splashVolume}
          min={0}
          max={1}
          step={0.01}
          formatValue={formatPercent}
          onChange={setSplashVolume}
        />
      </section>
    </div>
  );
}
