import { hexToRgba } from "./color";

// --- Squares ---
const HIGHLIGHT_ATTR = "data-cge-highlight";

// Matches "(none)"/"0000"/empty-ish engine outputs
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function isValidUciMove(uciMove: string): boolean {
  return UCI_MOVE_PATTERN.test(uciMove);
}

export interface RenderOptions {
  color: string;
  opacity?: number;
  clear?: boolean;
}

function fileToDigit(file: string): number {
  return file.charCodeAt(0) - 96; // 'a' -> 1, 'h' -> 8
}

function squareToClassSuffix(square: string): string {
  const fileChar = square[0];
  const rankChar = square[1];
  if (fileChar === undefined || rankChar === undefined) {
    throw new Error(`squareToClassSuffix: invalid square "${square}"`);
  }
  return `${fileToDigit(fileChar)}${rankChar}`;
}

function createHighlightEl(square: string, color: string): HTMLDivElement {
  const suffix = squareToClassSuffix(square);
  const el = document.createElement("div");
  el.className = `highlight square-${suffix}`;
  el.setAttribute(HIGHLIGHT_ATTR, "true"); // tag ours so cleanup never touches the site's own highlights
  el.style.backgroundColor = color;
  return el;
}

export function clearHighlightTiles(): void {
  document
    .querySelectorAll(`[${HIGHLIGHT_ATTR}]`)
    .forEach((el) => el.remove());
}

export function showHighlightTiles(
  uciMove: string,
  { color, opacity = 0.85, clear = true }: RenderOptions,
): void {
  if (!isValidUciMove(uciMove)) {
    throw new Error(`showHighlightTiles: malformed UCI move "${uciMove}"`);
  }

  const boardEl = document.querySelector(".board");
  if (!boardEl) {
    throw new Error("showHighlightTiles: .board element not found");
  }

  if (clear) clearHighlightTiles();

  const fromSq = uciMove.slice(0, 2);
  const toSq = uciMove.slice(2, 4);

  boardEl.appendChild(createHighlightEl(fromSq, hexToRgba(color, opacity * 0.65)));
  boardEl.appendChild(createHighlightEl(toSq, hexToRgba(color, opacity)));
}

// --- Arrows ---
const SVG_NS = "http://www.w3.org/2000/svg";
const CELL = 12.5;
let overlaySvg: SVGSVGElement | null = null;

function squareToPoint(square: string): { x: number; y: number } {
  const fileChar = square[0];
  const rankChar = square[1];
  if (fileChar === undefined || rankChar === undefined) {
    throw new Error(`squareToPoint: invalid square "${square}"`);
  }

  const file = fileChar.charCodeAt(0) - 97; // 'a' = 97
  const rank = parseInt(rankChar, 10) - 1;
  return {
    x: (file + 0.5) * CELL,
    y: 100 - (rank + 0.5) * CELL,
  };
}

function rotation(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dx, -dy) * 180) / Math.PI - 180;
}

function ensureOverlay(boardEl: Element): SVGSVGElement {
  if (overlaySvg && boardEl.contains(overlaySvg)) {
    return overlaySvg;
  }

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "arrows");
  svg.setAttribute("id", "cge-arrows");

  boardEl.appendChild(svg);
  overlaySvg = svg;
  return svg;
}

function drawArrow(
  svg: SVGSVGElement,
  fromSq: string,
  toSq: string,
  color: string,
): SVGPolygonElement {
  const from = squareToPoint(fromSq);
  const to = squareToPoint(toSq);
  const rot = rotation(from, to);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const baseY = from.y + 4.5;
  const tipY = baseY + length - 9;

  const points = `
    ${from.x - 1.375} ${baseY},
    ${from.x - 1.375} ${tipY},
    ${from.x - 3.25}  ${tipY},
    ${from.x}         ${tipY + 4.5},
    ${from.x + 3.25}  ${tipY},
    ${from.x + 1.375} ${tipY},
    ${from.x + 1.375} ${baseY}
  `;

  const poly = document.createElementNS(SVG_NS, "polygon") as SVGPolygonElement;
  poly.classList.add("cge-arrow", "bestmove");
  poly.setAttribute("data-arrow", `${fromSq}${toSq}`);
  poly.setAttribute("points", points.trim());
  poly.setAttribute("transform", `rotate(${rot} ${from.x} ${from.y})`);
  poly.style.fill = color;

  svg.appendChild(poly);
  return poly;
}

function clearArrows(svg: SVGSVGElement): void {
  svg.querySelectorAll(".cge-arrow").forEach((el) => el.remove());
}

export function clearAllArrows(): void {
  const boardEl = document.querySelector(".board");
  const svg = boardEl?.querySelector("#cge-arrows");
  if (svg instanceof SVGSVGElement) {
    clearArrows(svg);
  }
}

export function showArrow(
  uciMove: string,
  { color, opacity = 0.85, clear = true }: RenderOptions,
): void {
  const boardEl = document.querySelector(".board");
  if (!boardEl) {
    throw new Error("showArrow: .board element not found");
  }

  if (!isValidUciMove(uciMove)) {
    throw new Error(`showArrow: malformed UCI move "${uciMove}"`);
  }

  const fromSq = uciMove.slice(0, 2);
  const toSq = uciMove.slice(2, 4);

  const svg = ensureOverlay(boardEl);
  if (clear) clearArrows(svg);
  drawArrow(svg, fromSq, toSq, hexToRgba(color, opacity));
}
