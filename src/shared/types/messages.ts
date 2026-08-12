import type { AnalyzeOptions, Candidate } from "./engine";

export type ExtensionMessage =
  | { type: "ANALYZE"; payload: AnalyzeOptions }
  | { type: "NEW_GAME" }
  | { type: "RESTART_ENGINE" }
  | { type: "CANCEL_ANALYSIS" };

export type ExtensionResponse =
  | { type: "ANALYZE_RESULT"; candidates: Candidate[] }
  | { type: "NEW_GAME_ACK" }
  | { type: "RESTART_ENGINE_ACK" }
  | { type: "CANCEL_ANALYSIS_ACK" };
