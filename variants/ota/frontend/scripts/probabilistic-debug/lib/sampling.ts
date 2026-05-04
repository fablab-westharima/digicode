/**
 * sampling.ts — spot-mode case selection for orchestrator Stage 3.
 *
 * 55.md Phase 4-tooling Stage 3: pick a small board × strategy spread out
 * of a 1000-case manifest so a focused compile run (default 80 cases) can
 * cover every supported board with at least 5 cases each, using all six
 * generation strategies before any one strategy fills up.
 *
 * Deterministic: given the same manifest, returns the same picks every
 * time (Map iteration order in V8 is insertion order, no RNG).
 *
 * Phase 6 will amend 55.md §1.4 from "20 boards × 5 = 100 cases" to
 * "16 boards × 5 = 80 cases" — the post-56.md RP2040-removal board count.
 */

import type { Manifest, ManifestEntry, Strategy } from './case-types';

const ALL_STRATEGIES: ReadonlyArray<Strategy> = [
  'singleton',
  'pair',
  'template',
  'matrix',
  'edge',
  'combo',
];

const DEFAULT_PER_BOARD_CAP = 5;

export interface SpotSamplingOptions {
  sampleSize: number;
  /** Max cases sampled per board. Default 5 (55.md §1.4). */
  perBoardCap?: number;
}

/**
 * Select a spot-mode subset out of the full manifest.
 *
 * Algorithm (per 55.md §1.4 "board 偏りなし"):
 *   1. Group all manifest cases by (boardId → strategy → cases[]).
 *   2. Pass 1 — strategy round-robin, board round-robin INSIDE each strategy.
 *      Iterate strategies in the canonical order singleton → pair → template
 *      → matrix → edge → combo. For each strategy, walk every board once and
 *      pick one case if the board has any cases left in that strategy and
 *      still has room (perBoardCap not yet reached). This guarantees that a
 *      small sampleSize spreads evenly across boards before any one board
 *      hits its cap.
 *   3. Pass 2 — board round-robin, fill remaining slots for boards still
 *      under perBoardCap from any strategy queue that has cases left. Stops
 *      when nothing was added in a full lap (no remaining cases anywhere).
 *   4. Stop globally when sampleSize is reached.
 *
 * The shift-based picking makes the algorithm trivially deterministic and
 * order-stable: a re-run with the same manifest yields identical picks.
 */
export function selectSpotCases(
  manifest: Manifest,
  opts: SpotSamplingOptions,
): ManifestEntry[] {
  const perBoardCap = opts.perBoardCap ?? DEFAULT_PER_BOARD_CAP;
  if (opts.sampleSize <= 0 || perBoardCap <= 0) return [];

  // Group: boardId → (strategy → cases queue)
  const byBoard = new Map<string, Map<Strategy, ManifestEntry[]>>();
  for (const c of manifest.cases) {
    let boardGroups = byBoard.get(c.boardId);
    if (!boardGroups) {
      boardGroups = new Map();
      byBoard.set(c.boardId, boardGroups);
    }
    let queue = boardGroups.get(c.strategy);
    if (!queue) {
      queue = [];
      boardGroups.set(c.strategy, queue);
    }
    queue.push(c);
  }

  const sampled: ManifestEntry[] = [];
  const perBoardPickedCount = new Map<string, number>();

  // Pass 1: strategy outer, board inner. Ensures cross-board fairness when
  // sampleSize is smaller than (boards × perBoardCap).
  outer: for (const strat of ALL_STRATEGIES) {
    for (const [boardId, boardGroups] of byBoard) {
      if (sampled.length >= opts.sampleSize) break outer;
      if ((perBoardPickedCount.get(boardId) ?? 0) >= perBoardCap) continue;
      const queue = boardGroups.get(strat);
      if (!queue || queue.length === 0) continue;
      sampled.push(queue.shift()!);
      perBoardPickedCount.set(
        boardId,
        (perBoardPickedCount.get(boardId) ?? 0) + 1,
      );
    }
  }

  // Pass 2: board round-robin fill from any remaining strategy queue.
  while (sampled.length < opts.sampleSize) {
    let progressed = false;
    for (const [boardId, boardGroups] of byBoard) {
      if (sampled.length >= opts.sampleSize) break;
      if ((perBoardPickedCount.get(boardId) ?? 0) >= perBoardCap) continue;
      for (const strat of ALL_STRATEGIES) {
        const queue = boardGroups.get(strat);
        if (queue && queue.length > 0) {
          sampled.push(queue.shift()!);
          perBoardPickedCount.set(
            boardId,
            (perBoardPickedCount.get(boardId) ?? 0) + 1,
          );
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break; // no more cases anywhere
  }

  return sampled;
}
