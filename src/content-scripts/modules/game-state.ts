import { Chess } from "chess.js";
import type { ChessColor, FEN } from "@/shared/types/chess";
import { readMoveList, type MoveListState } from "./move-list-reader";

export interface GameState {
  fen: FEN;
  pgn: string;
  sideToMove: ChessColor;
  isGameOver: boolean;
  result: string | null;
  moveListState: MoveListState;
}

export function inferGameState(): GameState | null {
  const moveListState = readMoveList();
  if (!moveListState) return null;

  const chess = new Chess();
  let fenAtCurrent: string | null = null;

  for (const move of moveListState.moves) {
    let result;
    try {
      result = chess.move(move.san);
    } catch {
      result = null;
    }

    if (!result) {
      throw new Error(
        `inferGameState: illegal/unparseable SAN "${move.san}" at ply ${move.ply}`,
      );
    }

    if (move.isCurrent) {
      fenAtCurrent = chess.fen();
    }
  }

  return {
    fen: (fenAtCurrent ?? chess.fen()) as FEN,
    pgn: chess.pgn(),
    sideToMove: chess.turn() as ChessColor,
    isGameOver: moveListState.isGameOver || chess.isGameOver(),
    result: moveListState.result,
    moveListState,
  };
}

export function flipSideToMove(fen: FEN): FEN {
  const [board, active, castling, , halfmove, fullmove] = fen.split(" ");
  if (!board || !active || !castling || !halfmove || !fullmove) {
    throw new Error(`flipSideToMove: malformed FEN "${fen}"`);
  }

  const flipped = active === "w" ? "b" : "w";
  return `${board} ${flipped} ${castling} - ${halfmove} ${fullmove}` as FEN;
}
