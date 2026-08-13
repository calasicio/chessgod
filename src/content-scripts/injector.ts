import { debounce } from "@/shared/debounce";
import { sendMessage } from "@/shared/messaging";
import type { ChessColor } from "@/shared/types/chess";
import type { Candidate } from "@/shared/types/engine";
import { getCurrentColor } from "./modules/data-extractor";
import { flipSideToMove, inferGameState } from "./modules/game-state";
import {
  clearAllArrows,
  clearHighlightTiles,
  isValidUciMove,
  showArrow,
  showHighlightTiles,
} from "./modules/move-visualizer";
import { watchForMoves } from "./modules/move-watcher";
import { getSettings, onSettingsChange, updateSettings } from "./modules/settings";
import type { Settings } from "./modules/settings";
import { injectPanel } from "./modules/ui-injector";

const SETTINGS_RENDER_DEBOUNCE_MS = 200;

interface SideCache {
  fen: string;
  depth: number;
  movetimeMs: number;
  candidates: Candidate[];
}

interface AnalysisCache {
  mine: SideCache | null;
  enemy: SideCache | null;
}

const cache: AnalysisCache = { mine: null, enemy: null };

let generation = 0;

function resetCache(): void {
  cache.mine = null;
  cache.enemy = null;
}

function clearBoard(): void {
  clearAllArrows();
  clearHighlightTiles();
}

async function search(
  fen: string,
  depth: number,
  movetimeMs: number,
): Promise<Candidate[] | null> {
  const result = await sendMessage({
    type: "ANALYZE",
    payload: { fen, depth, movetime: movetimeMs },
  });
  if (result.type !== "ANALYZE_RESULT") return null;

  const top = result.candidates[0]?.pv[0];
  if (!top || !isValidUciMove(top)) return null;

  return result.candidates;
}

function isStale(entry: SideCache | null, fen: string, side: Settings["mine"]): boolean {
  return (
    !entry ||
    entry.fen !== fen ||
    entry.depth !== side.depth ||
    entry.movetimeMs !== side.movetimeMs
  );
}

function render(
  results: { bestMove: string; color: string; opacity: number }[],
  displayMode: string,
): void {
  if (results.length === 0) {
    clearBoard();
    return;
  }

  const showArrows = displayMode === "arrows" || displayMode === "both";
  const showSquares = displayMode === "squares" || displayMode === "both";

  if (!showArrows) clearAllArrows();
  if (!showSquares) clearHighlightTiles();

  results.forEach((result, index) => {
    const options = { color: result.color, opacity: result.opacity, clear: index === 0 };
    if (showArrows) showArrow(result.bestMove, options);
    if (showSquares) showHighlightTiles(result.bestMove, options);
  });
}

function buildResults(
  settings: Settings,
): { bestMove: string; color: string; opacity: number }[] {
  const results: { bestMove: string; color: string; opacity: number }[] = [];

  const myMove = cache.mine?.candidates[0]?.pv[0];
  if (settings.mine.enabled && myMove && isValidUciMove(myMove)) {
    results.push({ bestMove: myMove, color: settings.mine.color, opacity: settings.mine.opacity });
  }

  const enemyMove = cache.enemy?.candidates[0]?.pv[0];
  if (settings.enemy.enabled && enemyMove && isValidUciMove(enemyMove)) {
    results.push({ bestMove: enemyMove, color: settings.enemy.color, opacity: settings.enemy.opacity });
  }

  return results;
}

async function renderSuggestions(ui: ReturnType<typeof injectPanel>): Promise<void> {
  const myGeneration = ++generation;
  const isCurrent = () => myGeneration === generation;

  const settings = getSettings();
  const state = inferGameState();

  if (!state || state.isGameOver || (!settings.mine.enabled && !settings.enemy.enabled)) {
    if (isCurrent()) {
      ui?.setLoading(false);
      clearBoard();
    }
    return;
  }

  const userColor = getCurrentColor();
  const isUserTurn = state.sideToMove === userColor;
  const hypotheticalFEN = flipSideToMove(state.fen);

  // "mine" only means something when it's genuinely my turn — analyzing it
  // on the enemy's turn would mean searching a flipped hypothetical that's
  // guaranteed to be thrown away the instant they actually move (the real
  // resulting position won't match this speculative one), which is pure
  // wasted engine time on the expensive side of the pair. "enemy" stays on
  // regardless of whose turn it is: on the enemy's turn it's their real
  // committed move, on my own turn it's still a genuine "what are they
  // threatening right now" heads-up worth having while I decide.
  if (!isUserTurn) cache.mine = null;

  const myFEN = state.fen;
  const enemyFEN = isUserTurn ? hypotheticalFEN : state.fen;

  const needsMine = isUserTurn && settings.mine.enabled && isStale(cache.mine, myFEN, settings.mine);
  const needsEnemy = settings.enemy.enabled && isStale(cache.enemy, enemyFEN, settings.enemy);

  if (needsMine || needsEnemy) {
    if (needsMine) cache.mine = null;
    if (needsEnemy) cache.enemy = null;
    if (isCurrent()) render(buildResults(settings), settings.displayMode);

    ui?.setLoading(true);
    ui?.setStatus("Analyzing…");

    // sequential — "mine" runs first (it's the one worth spending time on),
    // "enemy" is deliberately configured to be cheap/fast so it doesn't add
    // much to the total wait; EngineManager's queue also only allows one
    // worker operation in flight at a time regardless
    if (needsMine) {
      const candidates = await search(myFEN, settings.mine.depth, settings.mine.movetimeMs);
      if (!isCurrent()) return;
      cache.mine = candidates
        ? { fen: myFEN, depth: settings.mine.depth, movetimeMs: settings.mine.movetimeMs, candidates }
        : null;
    }
    if (needsEnemy) {
      const candidates = await search(enemyFEN, settings.enemy.depth, settings.enemy.movetimeMs);
      if (!isCurrent()) return;
      cache.enemy = candidates
        ? { fen: enemyFEN, depth: settings.enemy.depth, movetimeMs: settings.enemy.movetimeMs, candidates }
        : null;
    }
  }

  if (isCurrent()) {
    ui?.setLoading(false);
    ui?.setStatus("ChessGod");
    render(buildResults(settings), settings.displayMode);
  }
}

async function restart(
  ui: ReturnType<typeof injectPanel>,
  message: { type: "NEW_GAME" } | { type: "RESTART_ENGINE" },
  statusWhileRestarting: string,
): Promise<void> {
  ui?.setStatus(statusWhileRestarting);
  ui?.setLoading(true);
  clearBoard();
  resetCache();

  await sendMessage({ type: "CANCEL_ANALYSIS" });
  await sendMessage(message);

  ui?.setLoading(false);
  ui?.setStatus("ChessGod");
  await renderSuggestions(ui);
}

function main(): void {
  const ui = injectPanel({
    settings: getSettings(),
    onSettingsChange: (patch) => updateSettings(patch),
    onRestartGame: () => {
      restart(ui, { type: "NEW_GAME" }, "Restarting game…");
    },
    onRestartEngine: () => {
      restart(ui, { type: "RESTART_ENGINE" }, "Restarting engine…");
    },
  });

  const debouncedRender = debounce(() => {
    renderSuggestions(ui);
  }, SETTINGS_RENDER_DEBOUNCE_MS);

  onSettingsChange(() => {
    debouncedRender();
  });

  watchForMoves({
    onMove: () => {
      // situation-based cancel: a new move makes whatever's currently being
      // searched stale, so interrupt it immediately rather than let it run
      // to completion for a position nobody cares about anymore
      sendMessage({ type: "CANCEL_ANALYSIS" });
      renderSuggestions(ui);
    },
    onNewGame: () => {
      resetCache();
      sendMessage({ type: "CANCEL_ANALYSIS" });
      sendMessage({ type: "NEW_GAME" });
    },
  });
}

main();
