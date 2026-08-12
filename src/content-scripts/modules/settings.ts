export type DisplayMode = "arrows" | "squares" | "both";

export interface SideSettings {
  enabled: boolean;
  color: string;
  opacity: number;
  /** search depth ceiling for this side's own analysis */
  depth: number;
  /** hard cap on think time per position, in ms */
  movetimeMs: number;
}

export interface Settings {
  displayMode: DisplayMode;
  mine: SideSettings;
  enemy: SideSettings;
}

export type SettingsPatch = Partial<{
  displayMode: DisplayMode;
  mine: Partial<SideSettings>;
  enemy: Partial<SideSettings>;
}>;

export const DEFAULT_SETTINGS: Settings = {
  displayMode: "both",
  // "mine" is the line worth spending time on
  mine: { enabled: true, color: "#00aaff", opacity: 0.85, depth: 18, movetimeMs: 3000 },
  // "enemy" is just a quick heads-up on their actual best move right now
  enemy: { enabled: true, color: "#eb6150", opacity: 0.85, depth: 8, movetimeMs: 500 },
};

const STORAGE_KEY = "cge:settings:v3";

function isSideSettings(value: unknown): value is SideSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.enabled === "boolean" &&
    typeof v.color === "string" &&
    typeof v.opacity === "number" &&
    typeof v.depth === "number" &&
    typeof v.movetimeMs === "number"
  );
}

function isSettings(value: unknown): value is Settings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.displayMode === "arrows" ||
      v.displayMode === "squares" ||
      v.displayMode === "both") &&
    isSideSettings(v.mine) &&
    isSideSettings(v.enemy)
  );
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed: unknown = JSON.parse(raw);
    return isSettings(parsed) ? parsed : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private browsing quota, etc) — settings
    // still work for the current page lifetime, just won't persist
  }
}

function mergeSettings(base: Settings, patch: SettingsPatch): Settings {
  return {
    displayMode: patch.displayMode ?? base.displayMode,
    mine: { ...base.mine, ...patch.mine },
    enemy: { ...base.enemy, ...patch.enemy },
  };
}

let current = loadSettings();

type Listener = (settings: Settings) => void;
const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: SettingsPatch): Settings {
  current = mergeSettings(current, patch);
  persist(current);
  listeners.forEach((listener) => listener(current));
  return current;
}

export function onSettingsChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
