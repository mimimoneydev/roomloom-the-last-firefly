import { Vector3 } from '@iwsdk/core';
import { canHop } from './roomloom-routes.js';

/** `sources` records which real-room semantic source authored each resting place. */
export interface PuzzlePlan {
  points: Vector3[];
  sockets: Vector3[];
  measured: boolean;
  reason: string;
  sources: string[];
}
export type ClearPath = (a: Vector3, b: Vector3) => boolean;

export function planPuzzle(samples: readonly Vector3[], garden: Vector3, clear: ClearPath,
  sources: readonly string[] = []): PuzzlePlan {
  const valid = samples.filter(p => p.distanceTo(garden) >= .35);
  const origin = valid.map((_, i) => sources[i] ?? 'plane');
  const edges = valid.map(a => valid.map(b => canHop(a, b) && clear(a, b)));
  const home = valid.map(p => canHop(p, garden) && clear(p, garden));
  // Two measured sockets must lead to different otherwise-unreachable branches.
  for (let a = 0; a < valid.length; a++) for (let b = a + 1; b < valid.length; b++) {
    if (!home[a] || !home[b]) continue;
    const left = valid.findIndex((_, i) => !home[i] && edges[a][i] && !edges[b][i]);
    const right = valid.findIndex((_, i) => !home[i] && edges[b][i] && !edges[a][i] && i !== left && (left < 0 || !edges[left][i]));
    const intro = valid.findIndex((_, i) => home[i] && i !== a && i !== b && i !== left && i !== right &&
      (left < 0 || !edges[i][left]) && (right < 0 || !edges[i][right]));
    if (left >= 0 && right >= 0 && intro >= 0) return {
      points: [valid[intro].clone(), valid[left].clone(), valid[right].clone()],
      sockets: [valid[a].clone(), valid[b].clone()], measured: true,
      reason: `Two clear branches from ${origin[a]} and ${origin[b]} surfaces. One movable lantern.`,
      sources: [origin[intro], origin[left], origin[right], origin[a], origin[b]],
    };
  }
  // Smaller measured puzzles are preferable to pretending floating sites were scanned.
  const picked: number[] = [];
  // A measured vertical plane (wall) changes the solution shape, not just the position.
  const wall = valid.findIndex((_, i) => origin[i] === 'wall' && (home[i] || valid.some((p, j) => edges[i][j])));
  if (wall >= 0) picked.push(wall);
  for (let pass = 0; pass < 3; pass++) {
    let best = -1;
    for (let i = 0; i < valid.length; i++) {
      if (picked.includes(i) || !(home[i] || picked.some(j => edges[i][j]))) continue;
      if (best < 0 || valid[i].distanceToSquared(garden) > valid[best].distanceToSquared(garden)) best = i;
    }
    if (best < 0) break;
    picked.push(best);
  }
  if (picked.length) return { points: picked.map(i => valid[i].clone()), sockets: [], measured: true,
    reason: `${picked.length} measured resting places (${picked.map(i => origin[i]).join(', ')}). Try another garden position for a lantern puzzle.`,
    sources: picked.map(i => origin[i]) };
  // NO playable floating fallback. The caller must re-open the room scan.
  return { points: [], sockets: [], measured: false, sources: [],
    reason: 'No verified clear room route. Look at a clear table or wall and place the garden again.' };
}

/** Opt-in, explicitly labelled preview. Never the cold-start state a judge sees. */
export function practicePuzzle(garden = new Vector3(0, .2, 0)): PuzzlePlan {
  return { measured: false,
    reason: 'PREVIEW ONLY — no room measured. This is not the mixed-reality experience.',
    points: [new Vector3(0, 0, .45), new Vector3(-1.1, 0, 0), new Vector3(1.1, 0, 0)].map(p => p.add(garden)),
    sockets: [new Vector3(-.55, 0, 0), new Vector3(.55, 0, 0)].map(p => p.add(garden)),
    sources: ['preview', 'preview', 'preview', 'preview', 'preview'] };
}

export class RescuePuzzle {
  readonly points = Array.from({ length: 5 }, () => new Vector3()); // 0..2 creatures, 3 relay, 4 home
  readonly sockets = [new Vector3(), new Vector3()];
  readonly lit = [false, false, false];
  readonly edges = new Uint8Array(25);
  private socketEdges = [new Uint8Array(5), new Uint8Array(5)];
  count = 3;
  hasRelay = false;
  choice = -1;
  previousChoice = -1;
  configure(points: readonly Vector3[], sockets: readonly Vector3[], garden: Vector3, clear: ClearPath): void {
    this.count = points.length; this.hasRelay = sockets.length === 2;
    for (let i = 0; i < points.length; i++) this.points[i].copy(points[i]);
    this.points[4].copy(garden);
    this.edges.fill(0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      if (i === 3 || j === 3) continue;
      this.edges[i * 5 + j] = Number(canHop(this.points[i], this.points[j]) && clear(this.points[i], this.points[j]));
    }
    for (let c = 0; c < sockets.length; c++) {
      this.sockets[c].copy(sockets[c]);
      for (let i = 0; i < 5; i++) this.socketEdges[c][i] = Number(i !== 3 && canHop(sockets[c], this.points[i]) && clear(sockets[c], this.points[i]));
    }
    this.reset();
  }
  reset(): void { this.lit.fill(false); this.choice = -1; this.previousChoice = -1; this.applyChoice(); }
  choose(choice: number): void {
    if (!this.hasRelay || choice < 0 || choice > 1 || choice === this.choice) return;
    this.previousChoice = this.choice; this.choice = choice; this.applyChoice();
  }
  undo(): void { const old = this.choice; this.choice = this.previousChoice; this.previousChoice = old; this.applyChoice(); }
  private applyChoice(): void {
    if (this.choice >= 0) this.points[3].copy(this.sockets[this.choice]);
    for (let i = 0; i < 5; i++) this.edges[3 * 5 + i] = this.edges[i * 5 + 3] = this.choice < 0 ? 0 : this.socketEdges[this.choice][i];
  }
  path(index: number): number[] | null {
    if (index >= this.count) return null;
    const parent = [-2, -2, -2, -2, -2], queue = [index]; parent[index] = -1;
    for (let h = 0; h < queue.length; h++) {
      const i = queue[h];
      for (let j = 0; j < 5; j++) {
        if (parent[j] !== -2 || !this.edges[i * 5 + j] || (j < 3 && (j >= this.count || !this.lit[j])) || (j === 3 && this.choice < 0)) continue;
        parent[j] = i; queue.push(j);
        if (j === 4) { const path: number[] = []; for (let k = 4; k !== index; k = parent[k]) path.unshift(k); return path; }
      }
    }
    return null;
  }
}
