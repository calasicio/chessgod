import panelCss from "./panel.css";
import panelHtml from "./panel.html";
import type { DisplayMode, Settings, SettingsPatch } from "./settings";

export interface InjectPanelOptions {
  settings: Settings;
  onSettingsChange: (patch: SettingsPatch) => void;
  onRestartGame: () => void;
  onRestartEngine: () => void;
}

export interface PanelHandle {
  setStatus: (text: string) => void;
  setLoading: (isLoading: boolean) => void;
}

let panelEl: HTMLDivElement | null = null;

const SIDES = ["mine", "enemy"] as const;

function readFieldValue(
  input: HTMLInputElement | HTMLSelectElement,
): string | number | boolean {
  if (input instanceof HTMLInputElement) {
    if (input.type === "checkbox") return input.checked;
    if (input.type === "range") return Number(input.value);
    return input.value;
  }
  return input.value;
}

function buildPatch(field: string, value: string | number | boolean): SettingsPatch {
  const [root, leaf] = field.split(".");

  if (root === "mine" || root === "enemy") {
    if (!leaf) return {};
    return { [root]: { [leaf]: value } };
  }

  if (root === "displayMode") return { displayMode: value as DisplayMode };

  return {};
}

function hydrate(shadow: ShadowRoot, settings: Settings): void {
  const displaySelect = shadow.querySelector<HTMLSelectElement>(
    'select[data-field="displayMode"]',
  );
  if (displaySelect) displaySelect.value = settings.displayMode;

  for (const side of SIDES) {
    const config = settings[side];

    const enabledInput = shadow.querySelector<HTMLInputElement>(
      `input[data-field="${side}.enabled"]`,
    );
    if (enabledInput) enabledInput.checked = config.enabled;

    const colorInput = shadow.querySelector<HTMLInputElement>(
      `input[data-field="${side}.color"]`,
    );
    if (colorInput) colorInput.value = config.color;

    const opacityInput = shadow.querySelector<HTMLInputElement>(
      `input[data-field="${side}.opacity"]`,
    );
    if (opacityInput) opacityInput.value = String(config.opacity);

    const depthInput = shadow.querySelector<HTMLInputElement>(
      `input[data-field="${side}.depth"]`,
    );
    if (depthInput) depthInput.value = String(config.depth);
    const depthLabel = shadow.getElementById(`cge-${side}-depth-value`);
    if (depthLabel) depthLabel.textContent = String(config.depth);

    const movetimeInput = shadow.querySelector<HTMLInputElement>(
      `input[data-field="${side}.movetimeMs"]`,
    );
    if (movetimeInput) movetimeInput.value = String(config.movetimeMs);
    const movetimeLabel = shadow.getElementById(`cge-${side}-movetimeMs-value`);
    if (movetimeLabel) movetimeLabel.textContent = String(config.movetimeMs);
  }
}

export function injectPanel({
  settings,
  onSettingsChange,
  onRestartGame,
  onRestartEngine,
}: InjectPanelOptions): PanelHandle | undefined {
  if (panelEl) {
    return;
  }

  panelEl = document.createElement("div");
  panelEl.id = "chess-god-extension";

  const shadow = panelEl.attachShadow({ mode: "closed" });

  const styleEl = document.createElement("style");
  styleEl.textContent = panelCss;
  shadow.append(styleEl);

  const parsed = new DOMParser().parseFromString(panelHtml, "text/html");
  shadow.append(...Array.from(parsed.body.childNodes));

  hydrate(shadow, settings);

  const fabButton = shadow.getElementById("cge--fab");
  if (!(fabButton instanceof HTMLButtonElement)) {
    throw new Error("injectPanel: fab button failed to render in shadow DOM");
  }

  const panelContainer = shadow.getElementById("cge-panel");
  if (!panelContainer) {
    throw new Error("injectPanel: settings panel failed to render in shadow DOM");
  }

  const loaderEl = shadow.getElementById("cge-loader");
  if (!loaderEl) {
    throw new Error("injectPanel: loader failed to render in shadow DOM");
  }

  fabButton.addEventListener("click", () => {
    panelContainer.classList.toggle("open");
  });

  panelContainer.addEventListener("input", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement)
    ) {
      return;
    }

    const field = target.dataset["field"];
    if (!field) return;

    if (target instanceof HTMLInputElement && target.type === "range") {
      const labelId = `cge-${field.replace(".", "-")}-value`;
      const label = shadow.getElementById(labelId);
      if (label) label.textContent = target.value;
    }

    onSettingsChange(buildPatch(field, readFieldValue(target)));
  });

  panelContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.closest<HTMLElement>("[data-action]")?.dataset["action"];
    if (action === "restart-game") onRestartGame();
    if (action === "restart-engine") onRestartEngine();
  });

  document.body.appendChild(panelEl);

  return {
    setStatus: (text: string) => {
      fabButton.title = text;
    },
    setLoading: (isLoading: boolean) => {
      loaderEl.classList.toggle("visible", isLoading);
    },
  };
}

export function removePanel(): void {
  panelEl?.remove();
  panelEl = null;
}
