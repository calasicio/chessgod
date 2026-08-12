import type { AnalyzeOptions, Candidate } from "@/shared/types/engine";

const MIN_DEPTH = 1;
const MAX_DEPTH = 30;
const DEFAULT_DEPTH = 18;

const MIN_MULTIPV = 1;
const MAX_MULTIPV = 8;
const DEFAULT_MULTIPV = 1;

const MIN_MOVETIME_MS = 100;
const MAX_MOVETIME_MS = 15_000;
const DEFAULT_MOVETIME_MS = 3_000;

const MATE_SCORE = 100_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function parseInfoLine(line: string): Candidate | null {
  if (!line.startsWith("info") || !line.includes(" multipv ")) return null;
  // aspiration-window search still in progress for this depth. score
  // is only a bound, not a settled value, so it's not a usable candidate
  if (line.includes(" upperbound") || line.includes(" lowerbound")) return null;

  const depthStr = line.match(/\bdepth (\d+)/)?.[1];
  const multipvStr = line.match(/\bmultipv (\d+)/)?.[1];
  const pvStr = line.match(/\bpv (.+)$/)?.[1]?.trim();
  if (!depthStr || !multipvStr || !pvStr) return null;

  const pv = pvStr.split(/\s+/);
  if (pv.length === 0) return null;

  const cpStr = line.match(/\bscore cp (-?\d+)/)?.[1];
  const mateStr = line.match(/\bscore mate (-?\d+)/)?.[1];
  if (cpStr === undefined && mateStr === undefined) return null;

  let score: number;
  let isMate = false;
  if (mateStr !== undefined) {
    isMate = true;
    const mateIn = Number(mateStr);
    score = mateIn > 0 ? MATE_SCORE - mateIn : -MATE_SCORE - mateIn;
  } else {
    score = Number(cpStr);
  }

  return {
    pv,
    depth: Number(depthStr),
    multipv: Number(multipvStr),
    score,
    isMate,
  };
}

export class EngineManager {
  #engineUrl: string;
  #worker: Worker;
  #ready: Promise<void>;
  #queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.#engineUrl = browser.runtime.getURL(
      "vendor/stockfish/stockfish-18-lite-single.js",
    );
    this.#worker = new Worker(this.#engineUrl);
    this.#ready = this.#initialize();
  }

  #enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.#queue.then(task, task);
    this.#queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  #waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const onMessage = (e: MessageEvent) => {
        const line: string = e.data;
        if (line === "readyok") {
          this.#worker.removeEventListener("message", onMessage);
          resolve();
        }
      };
      this.#worker.addEventListener("message", onMessage);
      this.#worker.postMessage("isready");
    });
  }

  #initialize(): Promise<void> {
    return new Promise((resolve) => {
      const onUciOk = (e: MessageEvent) => {
        if (e.data !== "uciok") return;
        this.#worker.removeEventListener("message", onUciOk);
        this.#worker.postMessage("ucinewgame");
        this.#waitForReady().then(resolve);
      };
      this.#worker.addEventListener("message", onUciOk);
      this.#worker.postMessage("uci");
    });
  }

  async newGame(): Promise<void> {
    return this.#enqueue(async () => {
      await this.#ready;
      this.#worker.postMessage("ucinewgame");
      this.#ready = this.#waitForReady();
      await this.#ready;
    });
  }

  async restart(): Promise<void> {
    return this.#enqueue(async () => {
      this.#worker.terminate();
      this.#worker = new Worker(this.#engineUrl);
      this.#ready = this.#initialize();
      await this.#ready;
    });
  }

  async analyze(options: AnalyzeOptions): Promise<Candidate[]> {
    return this.#enqueue(() => this.#search(options));
  }

  stop(): void {
    this.#worker.postMessage("stop");
  }

  async #search({
    fen,
    depth = DEFAULT_DEPTH,
    movetime = DEFAULT_MOVETIME_MS,
    multipv = DEFAULT_MULTIPV,
  }: AnalyzeOptions): Promise<Candidate[]> {
    await this.#ready;

    const clampedDepth = clamp(depth, MIN_DEPTH, MAX_DEPTH);
    const clampedMultipv = clamp(multipv, MIN_MULTIPV, MAX_MULTIPV);
    const clampedMovetime = clamp(movetime, MIN_MOVETIME_MS, MAX_MOVETIME_MS);

    return new Promise((resolve, reject) => {
      const candidates = new Map<number, Candidate>();

      const onMessage = (e: MessageEvent) => {
        const line: string = e.data;

        const info = parseInfoLine(line);
        if (info) {
          candidates.set(info.multipv, info);
          return;
        }

        if (line.startsWith("bestmove")) {
          this.#worker.removeEventListener("message", onMessage);

          const bestMove = line.split(" ")[1];
          if (!bestMove) {
            reject(new Error(`Malformed bestmove line: "${line}"`));
            return;
          }

          const sorted = [...candidates.values()].sort(
            (a, b) => a.multipv - b.multipv,
          );

          if (sorted.length === 0) {
            // no usable "info ... multipv ..." line. fall back to just the bestmove
            resolve([
              { pv: [bestMove], depth: clampedDepth, multipv: 1, score: 0, isMate: false },
            ]);
            return;
          }

          resolve(sorted);
        }
      };

      this.#worker.addEventListener("message", onMessage);
      this.#worker.postMessage(`setoption name MultiPV value ${clampedMultipv}`);
      this.#worker.postMessage(`position fen ${fen}`);
      this.#worker.postMessage(`go depth ${clampedDepth} movetime ${clampedMovetime}`);
    });
  }

  destroy(): void {
    this.#worker.terminate();
  }
}
