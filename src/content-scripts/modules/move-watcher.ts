import { debounce } from "@/shared/debounce";

const MOVE_LIST_SELECTOR = "wc-simple-move-list";
const MOVE_NODE_SELECTOR = ".node.main-line-ply";
const CONTAINER_POLL_INTERVAL_MS = 1000;
const MUTATION_DEBOUNCE_MS = 250;

export interface MoveWatcherHandle {
  stop: () => void;
}

export interface WatchForMovesCallbacks {
  onMove: () => void;
  // Fires when the ply count went backwads or the move-list container
  // got swapped out
  onNewGame?: () => void;
}

function getPlyCount(): number {
  return document.querySelectorAll(
    `${MOVE_LIST_SELECTOR} ${MOVE_NODE_SELECTOR}`,
  ).length;
}

export function watchForMoves({
  onMove,
  onNewGame,
}: WatchForMovesCallbacks): MoveWatcherHandle {
  let lastPlyCount = -1;
  let hasSeenMoves = false;
  let observer: MutationObserver | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentContainer: Element | null = null;
  let stopped = false;

  const debouncedCheck = debounce(() => {
    if (stopped) return;
    const currentPlyCount = getPlyCount();
    if (currentPlyCount === lastPlyCount) return;

    if (hasSeenMoves && currentPlyCount < lastPlyCount) {
      onNewGame?.();
    }

    lastPlyCount = currentPlyCount;
    hasSeenMoves = true;
    onMove();
  }, MUTATION_DEBOUNCE_MS);

  function attachObserver(container: Element) {
    observer?.disconnect();
    observer = new MutationObserver(debouncedCheck);
    observer.observe(container, { childList: true, subtree: true });
  }

  function ensureContainerWatched() {
    if (stopped) return;

    const container = document.querySelector(MOVE_LIST_SELECTOR);
    if (!container || container === currentContainer) return;

    const isContainerSwap = currentContainer !== null;
    currentContainer = container;
    attachObserver(container);

    if (isContainerSwap) {
      lastPlyCount = -1;
      onNewGame?.();
    }

    debouncedCheck(); // catch up immediately in case moves already exist
  }

  pollTimer = setInterval(ensureContainerWatched, CONTAINER_POLL_INTERVAL_MS);
  ensureContainerWatched(); // attempt immediately too, don't wait a full interval

  return {
    stop: () => {
      stopped = true;
      observer?.disconnect();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}
