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

const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "arrows", label: "Arrows only" },
  { value: "squares", label: "Squares only" },
  { value: "both", label: "Arrows + squares" },
];

function renderSideSection(
  key: "mine" | "enemy",
  title: string,
  side: Settings["mine"],
): string {
  return `
    <div class="side">
      <label class="switch">
        <input type="checkbox" data-field="${key}.enabled" ${side.enabled ? "checked" : ""} />
        <span>${title}</span>
      </label>
      <div class="side-controls">
        <label class="field">
          <span>Color</span>
          <input type="color" data-field="${key}.color" value="${side.color}" />
        </label>
        <label class="field">
          <span>Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            data-field="${key}.opacity"
            value="${side.opacity}"
          />
        </label>
      </div>
      <label class="field">
        <span>Depth (<span id="cge-${key}-depth-value">${side.depth}</span>)</span>
        <input
          type="range"
          min="1"
          max="24"
          step="1"
          data-field="${key}.depth"
          value="${side.depth}"
        />
      </label>
      <label class="field">
        <span>Max think time (<span id="cge-${key}-movetimeMs-value">${side.movetimeMs}</span>ms)</span>
        <input
          type="range"
          min="100"
          max="15000"
          step="100"
          data-field="${key}.movetimeMs"
          value="${side.movetimeMs}"
        />
      </label>
    </div>
  `;
}

function renderPanelBody(settings: Settings): string {
  return `
    <div class="panel-title">ChessGod</div>

    <label class="field">
      <span>Show</span>
      <select data-field="displayMode">
        ${DISPLAY_MODE_OPTIONS.map(
          (opt) =>
            `<option value="${opt.value}" ${opt.value === settings.displayMode ? "selected" : ""}>${opt.label}</option>`,
        ).join("")}
      </select>
    </label>

    ${renderSideSection("mine", "My best move", settings.mine)}
    ${renderSideSection("enemy", "Enemy best move", settings.enemy)}

    <div class="actions">
      <button type="button" class="btn" data-action="restart-game">
        Restart game
      </button>
      <button type="button" class="btn btn-danger" data-action="restart-engine">
        Restart engine
      </button>
    </div>
  `;
}

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
  shadow.innerHTML = `
    <style>
      #cge {
        --color-neutrals-white: #ffffff;

        --color-green-100: #d8fa9d;
        --color-green-200: #b2e068;
        --color-green-300: #81b64c;
        --color-green-400: #5d9948;
        --color-green-500: #45753c;
        --color-green-600: #305730;
        --color-green-700: #204227;
        --color-green-800: #1c3724;
        --color-green-900: #162921;

        --textColor: var(--color-neutrals-white);
        --textColorHover: var(--color-neutrals-white);

        --color-transparent-black-2: rgba(0, 0, 0, 0.02);
        --color-transparent-black-5: rgba(0, 0, 0, 0.05);
        --color-transparent-black-18: rgba(0, 0, 0, 0.18);
        --color-transparent-black-30: rgba(0, 0, 0, 0.3);
        --color-transparent-black-50: rgba(0, 0, 0, 0.5);
        --color-transparent-black-65: rgba(0, 0, 0, 0.65);
        --color-transparent-black-77: rgba(0, 0, 0, 0.77);

        --cc-bg-color: linear-gradient(
          180deg,
          var(--color-green-300) 0%,
          var(--color-green-400) 100%
        );
        --cc-bg-color-hover:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-green-200), transparent 50%) 0%,
            transparent 100%
          ),
          linear-gradient(
            180deg,
            var(--color-green-300) 0%,
            var(--color-green-400) 100%
          );
        --cc-bg-box-shadow:
          inset 0 0.1rem 0 0
            color-mix(in srgb, var(--color-green-200), transparent 60%),
          inset 0 -0.1rem 0 0 var(--color-green-500),
          inset 0 0.2rem 0.4rem 0
            color-mix(in srgb, var(--color-green-200), transparent 50%),
          inset 0 -0.2rem 0.4rem 0
            color-mix(in srgb, var(--color-green-500), transparent 50%),
          0 0.1rem 0.2rem 0 var(--color-transparent-black-14),
          0 0.2rem 0.4rem 0 var(--color-transparent-black-10);
        --cc-bg-box-shadow-hover:
          inset 0 0.1rem 0 0
            color-mix(in srgb, var(--color-green-100), transparent 60%),
          inset 0 0.2rem 0.4rem 0
            color-mix(in srgb, var(--color-green-200), transparent 50%),
          inset 0 -0.1rem 0 0 var(--color-green-500),
          inset 0 -0.2rem 0.4rem 0
            color-mix(in srgb, var(--color-green-500), transparent 50%),
          0 0.1rem 0.2rem 0 var(--color-transparent-black-14),
          0 0.2rem 0.4rem 0 var(--color-transparent-black-10);

        position: fixed;
        pointer-events: none;
        inset: 0;
        background-color: transparent;
        z-index: 999999;
        font-family: system-ui, sans-serif;

        .container {
          position: relative;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .fab-wrap {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          width: 42px;
          height: 42px;
        }

        .fab {
          position: absolute;
          inset: 0;
          cursor: pointer;
          pointer-events: auto;
          border-radius: 100%;
          background-color: var(--color-green-400);
          background-image: var(--cc-bg-color);
          border: none;
          box-shadow: var(--cc-bg-box-shadow);
          color: var(--textColor);
        }

        .fab:hover {
          background-color: var(--color-green-200);
          background-image: var(--cc-bg-color-hover);
          box-shadow: var(--cc-bg-box-shadow-hover);
        }

        .cge-loader {
          display: none;
          position: absolute;
          /* sits fully outside the fab: 2px gap beyond its edge, ring itself
             drawn by ::before */
          inset: -5px;
          border-radius: 50%;
          pointer-events: none;
          animation: cge-loader-rotate 1s linear infinite;
        }

        .cge-loader.visible {
          display: block;
        }

        .cge-loader::before {
          content: "";
          box-sizing: border-box;
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid var(--color-neutrals-white);
          animation: cge-loader-clip 2s linear infinite;
        }

        .panel {
          position: absolute;
          bottom: 4rem;
          right: 1rem;
          width: 240px;
          display: none;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.85rem;
          border-radius: 10px;
          background: var(--color-green-900);
          color: var(--textColor);
          box-shadow: 0 0.4rem 1rem var(--color-transparent-black-50);
          pointer-events: auto;
          font-size: 12px;
        }

        .panel.open {
          display: flex;
        }

        .panel-title {
          font-size: 13px;
          font-weight: 700;
          border-bottom: 1px solid var(--color-transparent-black-30);
          padding-bottom: 0.5rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field select,
        .field input[type="range"] {
          width: 100%;
        }

        .field input[type="color"] {
          width: 100%;
          height: 24px;
          border: none;
          border-radius: 4px;
          background: none;
          padding: 0;
        }

        select {
          background: var(--color-green-700);
          color: var(--textColor);
          border: 1px solid var(--color-green-500);
          border-radius: 4px;
          padding: 0.3rem;
        }

        .side {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          border-top: 1px solid var(--color-transparent-black-30);
          padding-top: 0.5rem;
        }

        .switch {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          cursor: pointer;
        }

        .side-controls {
          display: flex;
          gap: 0.5rem;
        }

        .side-controls .field {
          flex: 1;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          border-top: 1px solid var(--color-transparent-black-30);
          padding-top: 0.5rem;
        }

        .btn {
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--color-green-500);
          border-radius: 4px;
          padding: 0.4rem;
          background: var(--color-green-700);
          color: var(--textColor);
        }

        .btn:hover {
          background: var(--color-green-500);
        }

        .btn-danger {
          border-color: color-mix(in srgb, #eb6150, black 20%);
          background: color-mix(in srgb, #eb6150, transparent 60%);
        }

        .btn-danger:hover {
          background: color-mix(in srgb, #eb6150, transparent 30%);
        }
      }

      #cge-arrows {
        position: absolute;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 989891;
      }

      @keyframes cge-loader-rotate {
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes cge-loader-clip {
        0% {
          clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
        }
        25% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
        }
        50% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
        }
        75% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%);
        }
        100% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0);
        }
      }
    </style>
    <div id="cge">
      <div class="container">
        <div id="cge-panel" class="panel">${renderPanelBody(settings)}</div>
        <div class="fab-wrap">
          <button id="cge--fab" class="fab" type="button">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              data-glyph="utility-cogwheel"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="currentColor"
                d="M9.57 20.5298L8.4 21.7998C8.03 22.1998 7.73 22.2298 7.27 21.9698L5.74 21.0998C5.27 20.8298 5.17 20.5298 5.31 20.0298L5.84 18.3598C5.97 17.8598 5.94 17.4898 5.67 17.0298L4.5 14.9598C4.23 14.4898 3.93 14.2898 3.43 14.1598L1.7 13.7598C1.2 13.6298 1 13.3898 1 12.8598V11.0898C1 10.5898 1.2 10.3598 1.7 10.2198L3.43 9.81985C3.93 9.68985 4.23 9.48985 4.5 9.01985L5.67 6.94985C5.94 6.47985 5.97 6.11985 5.84 5.61985L5.31 3.94985C5.18 3.44985 5.28 3.14985 5.74 2.87985L7.27 2.00985C7.74 1.73985 8.04 1.77985 8.4 2.17985L9.57 3.44985C9.94 3.84985 10.27 3.97985 10.8 3.97985H13.23C13.73 3.97985 14.06 3.84985 14.43 3.44985L15.6 2.17985C15.97 1.77985 16.27 1.74985 16.73 2.00985L18.26 2.87985C18.73 3.14985 18.83 3.44985 18.69 3.94985L18.16 5.61985C18.03 6.11985 18.06 6.48985 18.33 6.94985L19.5 9.01985C19.77 9.48985 20.07 9.68985 20.57 9.81985L22.3 10.2198C22.8 10.3498 23 10.5898 23 11.0898V12.8598C23 13.3898 22.8 13.6298 22.3 13.7598L20.57 14.1598C20.07 14.2898 19.77 14.4898 19.5 14.9598L18.33 17.0298C18.06 17.4998 18.03 17.8598 18.16 18.3598L18.69 20.0298C18.82 20.5298 18.72 20.8298 18.26 21.0998L16.73 21.9698C16.26 22.2398 15.96 22.1998 15.6 21.7998L14.43 20.5298C14.06 20.1298 13.73 19.9998 13.23 19.9998H10.8C10.27 19.9998 9.93 20.1298 9.57 20.5298ZM12.03 15.4998C13.93 15.4998 15.53 13.9298 15.53 11.9698C15.53 10.0698 13.93 8.49985 12.03 8.49985C10.1 8.49985 8.53 10.0698 8.53 11.9698C8.53 13.9398 10.1 15.4998 12.03 15.4998Z"
              ></path>
            </svg>
          </button>
          <div id="cge-loader" class="cge-loader"></div>
        </div>
      </div>
    </div>
  `;

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
