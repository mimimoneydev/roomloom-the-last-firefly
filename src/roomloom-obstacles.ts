import { Matrix4, Triangle, Vector3 } from '@iwsdk/core';

// Snapshot observed room geometry only. Overflow or an untracked mesh fails closed.
// Paths are tested along the same 12 cm arc used by the animated light, in both
// directions. A 10 cm swept envelope covers the creature and sample spacing.
export class RoomObstacles {
  private triangles = new Float32Array(12000 * 9);
  count = 0;
  complete = true;
  measured = false;
  private matrix = new Matrix4();
  private triangle = new Triangle();
  private p = new Vector3();
  private closest = new Vector3();
  private a = new Vector3();
  private b = new Vector3();
  private c = new Vector3();
  add(a: Vector3, b: Vector3, c: Vector3): void {
    if (this.count >= 12000) { this.complete = false; return; }
    const offset = this.count++ * 9;
    a.toArray(this.triangles, offset); b.toArray(this.triangles, offset + 3); c.toArray(this.triangles, offset + 6);
    this.measured = true;
  }
  collect(frame: XRFrame, space: XRReferenceSpace): void {
    this.count = 0; this.complete = true; this.measured = false;
    for (const mesh of frame.detectedMeshes ?? []) {
      const pose = frame.getPose(mesh.meshSpace, space);
      if (!pose) { this.complete = false; continue; }
      this.matrix.fromArray(pose.transform.matrix);
      for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
        this.a.fromArray(mesh.vertices, mesh.indices[i] * 3).applyMatrix4(this.matrix);
        this.b.fromArray(mesh.vertices, mesh.indices[i + 1] * 3).applyMatrix4(this.matrix);
        this.c.fromArray(mesh.vertices, mesh.indices[i + 2] * 3).applyMatrix4(this.matrix);
        this.add(this.a, this.b, this.c);
        if (!this.complete) break;
      }
    }
    // Plane fans are conservative for concave polygons: uncertain cutouts are blocked.
    for (const plane of frame.detectedPlanes ?? []) {
      const pose = frame.getPose(plane.planeSpace, space);
      if (!pose) { this.complete = false; continue; }
      this.matrix.fromArray(pose.transform.matrix);
      const polygon = plane.polygon;
      for (let i = 1; i + 1 < polygon.length; i++) {
        this.a.set(polygon[0].x, polygon[0].y, polygon[0].z).applyMatrix4(this.matrix);
        this.b.set(polygon[i].x, polygon[i].y, polygon[i].z).applyMatrix4(this.matrix);
        this.c.set(polygon[i + 1].x, polygon[i + 1].y, polygon[i + 1].z).applyMatrix4(this.matrix);
        this.add(this.a, this.b, this.c);
      }
    }
  }
  clear(a: Vector3, b: Vector3): boolean {
    if (!this.complete || !this.measured) return false;
    const minX = Math.min(a.x,b.x)-.1, maxX = Math.max(a.x,b.x)+.1;
    const minY = Math.min(a.y,b.y)-.1, maxY = Math.max(a.y,b.y)+.22;
    const minZ = Math.min(a.z,b.z)-.1, maxZ = Math.max(a.z,b.z)+.1;
    const steps = Math.max(2, Math.ceil(a.distanceTo(b) / .04));
    for (let i = 0; i < this.count; i++) {
      this.triangle.a.fromArray(this.triangles, i*9);
      this.triangle.b.fromArray(this.triangles, i*9+3);
      this.triangle.c.fromArray(this.triangles, i*9+6);
      const t = this.triangle;
      if (Math.max(t.a.x,t.b.x,t.c.x)<minX || Math.min(t.a.x,t.b.x,t.c.x)>maxX ||
          Math.max(t.a.y,t.b.y,t.c.y)<minY || Math.min(t.a.y,t.b.y,t.c.y)>maxY ||
          Math.max(t.a.z,t.b.z,t.c.z)<minZ || Math.min(t.a.z,t.b.z,t.c.z)>maxZ) continue;
      for (let j = 0; j <= steps; j++) {
        const f = j / steps;
        this.p.lerpVectors(a,b,f); this.p.y += Math.sin(f * Math.PI) * .12;
        t.closestPointToPoint(this.p,this.closest);
        if (this.p.distanceToSquared(this.closest) <= .01) return false;
      }
    }
    return true;
  }
}
