export interface Candidate {
  pv: string[];
  depth: number;
  multipv: number;
  score: number;
  isMate: boolean;
}

export interface AnalyzeOptions {
  fen: string;
  /** search depth ceiling */
  depth?: number;
  /** hard time cap in ms whichever of depth/movetime is hit first stops the search */
  movetime?: number;
  /** how many candidate lines to return, ranked best-first */
  multipv?: number;
}
