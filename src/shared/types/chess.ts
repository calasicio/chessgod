export type ChessColor = "w" | "b";

export type FEN = string & { readonly __brand: "FEN" };
