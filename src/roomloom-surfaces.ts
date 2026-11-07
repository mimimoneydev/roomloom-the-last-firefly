import { RoomObstacles } from './roomloom-obstacles.js';
import { Matrix4, Vector3 } from '@iwsdk/core';

// Also works with concave plane boundaries. Require clearance for the garden bowl.
export function insideSurface(x: number, z: number, polygon: readonly DOMPointReadOnly[], clearance = 0): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) < clearance) return false;
  }
  return inside;
}

export type SurfaceSource = 'table' | 'plane' | 'wall' | 'mesh';

export class SurfaceSamples {
  readonly points = Array.from({ length: 64 }, () => new Vector3());
  /** Parallel to `points`: which real-room semantic source authored each sample. */
  readonly sources: SurfaceSource[] = Array.from({ length: 64 }, () => 'plane');
  count = 0;
  readonly obstacles = new RoomObstacles();
  private matrix = new Matrix4();
  private a = new Vector3();
  private b = new Vector3();
  private c = new Vector3();
  private normal = new Vector3();
  private edge = new Vector3();
  private candidate = new Vector3();
  private centroid = new Vector3();

  private accept(viewer: Vector3, forward: Vector3, source: SurfaceSource): void {
    const p = this.candidate;
    this.edge.copy(p).sub(viewer);
    if (p.y < 0.15 || p.y > 1.65 || this.edge.length() > 2.5 || this.edge.dot(forward) < this.edge.length() * 0.65) return;
    for (let i = 0; i < this.count; i++) if (this.points[i].distanceToSquared(p) < 0.16) return;
    if (this.count < this.points.length) {
      this.points[this.count].copy(p);
      this.sources[this.count] = source;
      this.count++;
    }
  }

  collect(frame: XRFrame, space: XRReferenceSpace, viewer: Vector3, forward: Vector3): void {
    this.count = 0;
    this.obstacles.collect(frame, space);
    for (const plane of frame.detectedPlanes ?? []) {
      const pose = frame.getPose(plane.planeSpace, space);
      if (!pose) continue;
      this.matrix.fromArray(pose.transform.matrix);
      const vertical = plane.orientation === 'vertical';
      if (!vertical && Math.abs(this.matrix.elements[5]) < 0.9) continue;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const p of plane.polygon) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      }
      const area = (maxX - minX) * (maxZ - minZ);
      if (vertical) {
        // A measured wall hosts a sheltering light: room topology changes the solution.
        const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
        if (!insideSurface(cx, cz, plane.polygon, 0.12)) continue;
        this.centroid.set(cx, 0, cz).applyMatrix4(this.matrix);
        this.normal.setFromMatrixColumn(this.matrix, 1).normalize();
        this.edge.copy(viewer).sub(this.centroid);
        if (this.normal.dot(this.edge) < 0) this.normal.negate();
        this.candidate.copy(this.centroid).addScaledVector(this.normal, 0.2);
        this.accept(viewer, forward, 'wall');
        continue;
      }
      const source: SurfaceSource = area < 1.6 ? 'table' : 'plane';
      for (let x = minX + 0.15; x < maxX; x += Math.max(0.4, (maxX - minX) / 8)) {
        for (let z = minZ + 0.15; z < maxZ; z += Math.max(0.4, (maxZ - minZ) / 8)) {
          if (!insideSurface(x, z, plane.polygon, 0.12)) continue;
          this.candidate.set(x, 0, z).applyMatrix4(this.matrix);
          this.candidate.y += 0.2;
          this.accept(viewer, forward, source);
        }
      }
    }
    for (const mesh of frame.detectedMeshes ?? []) {
      const pose = frame.getPose(mesh.meshSpace, space);
      if (!pose) continue;
      this.matrix.fromArray(pose.transform.matrix);
      const stride = Math.max(3, Math.ceil(mesh.indices.length / 384) * 3);
      for (let i = 0; i + 2 < mesh.indices.length; i += stride) {
        this.a.fromArray(mesh.vertices, mesh.indices[i] * 3).applyMatrix4(this.matrix);
        this.b.fromArray(mesh.vertices, mesh.indices[i + 1] * 3).applyMatrix4(this.matrix);
        this.c.fromArray(mesh.vertices, mesh.indices[i + 2] * 3).applyMatrix4(this.matrix);
        this.normal.subVectors(this.b, this.a); this.edge.subVectors(this.c, this.a);
        this.normal.cross(this.edge).normalize();
        if (Math.abs(this.normal.y) < 0.9) continue;
        this.candidate.copy(this.a).add(this.b).add(this.c).multiplyScalar(1 / 3);
        this.candidate.y += 0.16;
        this.accept(viewer, forward, 'mesh');
      }
    }
  }

  /** Compact list for telemetry, proving which surfaces authored the round. */
  authoringSources(): string[] { return this.sources.slice(0, this.count); }
}
