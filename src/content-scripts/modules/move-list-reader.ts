import type { ChessColor } from "@/shared/types/chess";

const ANALYSIS_LIST_SELECTOR = "wc-move-list";
const LIVE_LIST_SELECTOR = "wc-simple-move-list";
const MOVE_NODE_SELECTOR = ".node.main-line-ply";
const CONTENT_SELECTOR = ".node-highlight-content";

export interface SANMove {
  ply: number;
  moveNumber: number;
  color: ChessColor;
  san: string;
  nodeId: string;
  isCurrent: boolean;
}

export interface MoveListState {
  moves: SANMove[];
  currentNodeId: string | null;
  sideToMove: ChessColor;
  result: string | null;
  isGameOver: boolean;
}

function findContainer(): Element | null {
  return (
    document.querySelector(ANALYSIS_LIST_SELECTOR) ??
    document.querySelector(LIVE_LIST_SELECTOR)
  );
}

function extractSAN(contentEl: Element): string {
  const figurine = contentEl.querySelector("[data-figurine]");
  const pieceLetter = figurine?.getAttribute("data-figurine") ?? "";
  const text = (contentEl.textContent ?? "").replace(/\s+/g, "");
  return pieceLetter + text;
}

function extractResult(container: Element): string | null {
  const resultEl = container.querySelector(".result-row .game-result");
  const text = resultEl?.textContent?.trim();
  return text ? text : null;
}

export function readMoveList(): MoveListState | null {
  const container = findContainer();
  if (!container) return null;

  const nodes = container.querySelectorAll(MOVE_NODE_SELECTOR);
  const moves: SANMove[] = [];
  let currentNodeId: string | null = null;

  nodes.forEach((node, index) => {
    const contentEl = node.querySelector(CONTENT_SELECTOR);
    if (!contentEl) return;

    const nodeId = node.getAttribute("data-node") ?? "";
    const color: ChessColor = node.classList.contains("white-move") ? "w" : "b";
    const isCurrent = contentEl.classList.contains("selected");
    if (isCurrent) currentNodeId = nodeId;

    moves.push({
      ply: index + 1,
      moveNumber: Math.ceil((index + 1) / 2),
      color,
      san: extractSAN(contentEl),
      nodeId,
      isCurrent,
    });
  });

  const result = extractResult(container);

  return {
    moves,
    currentNodeId,
    sideToMove: moves.length % 2 === 0 ? "w" : "b",
    result,
    isGameOver: result !== null,
  };
}
