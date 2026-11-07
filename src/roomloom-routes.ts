import { Vector3 } from '@iwsdk/core';

export const MAX_HOP = 0.85;
export const MAX_RISE = 0.45;
export function canHop(a: Vector3, b: Vector3): boolean {
  return a.distanceToSquared(b) <= MAX_HOP * MAX_HOP && Math.abs(a.y - b.y) <= MAX_RISE;
}

// Select a connected, varied three-stop puzzle. Only measured points can be
// reported as room stops; disconnected/sparse rooms use an explicit practice route.
export function planRoute(samples: readonly Vector3[], garden: Vector3) {
  const depth = samples.map(() => -1);
  const parent = samples.map(() => -1);
  const queue: number[] = [];
  samples.forEach((p, i) => {
    if (p.distanceTo(garden) >= 0.35 && canHop(p, garden)) { depth[i] = 1; queue.push(i); }
  });
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    samples.forEach((p, j) => {
      if (depth[j] < 0 && p.distanceTo(garden) >= 0.35 && canHop(samples[i], p)) {
        depth[j] = depth[i] + 1; parent[j] = i; queue.push(j);
      }
    });
  }
  const candidates = queue.filter(i => depth[i] <= 3).sort((a, b) =>
    depth[b] - depth[a] || samples[b].distanceToSquared(garden) - samples[a].distanceToSquared(garden));
  const chosen: number[] = [];
  for (const i of candidates) {
    const path: number[] = [];
    for (let j = i; j >= 0 && !chosen.includes(j); j = parent[j]) path.unshift(j);
    if (chosen.length + path.length <= 3) chosen.push(...path);
    if (chosen.length === 3) break;
  }
  const measured = chosen.length === 3;
  const points = measured ? chosen.map(i => samples[i].clone()) : [
    new Vector3(-0.4, 0, 0.2).add(garden),
    new Vector3(0.3, 0.05, 0.2).add(garden),
    new Vector3(0.75, 0.05, 0.65).add(garden),
  ];
  return { points, measured };
}

export class LightRoute {
  readonly points = [new Vector3(), new Vector3(), new Vector3()];
  readonly garden = new Vector3(0, 0.2, 0);
  readonly lit = [false, false, false];
  readonly parents = [-1, -1, -1];
  reset(): void { this.lit.fill(false); this.parents.fill(-1); }
  reachable(index: number): boolean { return this.source(index) !== -2; }
  source(index: number): number {
    if (canHop(this.points[index], this.garden)) return -1;
    for (let i = 0; i < 3; i++) if (this.lit[i] && canHop(this.points[index], this.points[i])) return i;
    return -2;
  }
  light(index: number): boolean {
    const source = this.source(index);
    if (source === -2 || this.lit[index]) return false;
    this.parents[index] = source; this.lit[index] = true; return true;
  }
}
