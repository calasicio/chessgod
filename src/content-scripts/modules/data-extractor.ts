import type { ChessColor } from "@/shared/types/chess";

function isBoardFlipped(): boolean {
  const board = document.querySelector(".board");
  if (!board) {
    throw new Error(".board element not found on page");
  }
  return board.classList.contains("flipped");
}

export function getCurrentColor(): ChessColor {
  return isBoardFlipped() ? "b" : "w";
}
