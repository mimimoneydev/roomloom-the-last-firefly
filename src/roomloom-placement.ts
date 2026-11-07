import { Matrix4, Vector3, World } from '@iwsdk/core';
import { insideSurface, SurfaceSamples } from './roomloom-surfaces.js';

type PersistentAnchor = XRAnchor & { requestPersistentHandle?: () => Promise<string> };
type PersistentSession = XRSession & {
  restorePersistentAnchor?: (handle: string) => Promise<PersistentAnchor>;
  deletePersistentAnchor?: (handle: string) => Promise<void>;
};
const KEY = 'roomloom.anchor.v1';

export class RoomPlacement {
  scanning = false;
  private session: PersistentSession | null = null;
  private source: XRHitTestSource | null = null;
  private anchor: PersistentAnchor | null = null;
  private generation = 0;
  private confirm = false;
  private status = '';
  private ready = false;
  private located = false;
  private saved = false;
  private restoring = false;
  private restoreDeadline = 0;
  private matrix = new Matrix4();
  private flip = new Matrix4().makeRotationX(Math.PI);
  private inverse = new Matrix4();
  private point = new Vector3();
  private local = new Vector3();
  private viewer = new Vector3();
  private forward = new Vector3();
  private samples = new SurfaceSamples();
  private pinchAt = 0;
  /** A sustained pinch is required so a stray pinch cannot plant the garden. */
  private readonly HOLD_MS = 400;
  private readonly sourceOf = (event?: Event): XRInputSource | undefined =>
    event && 'inputSource' in event ? (event as XRInputSourceEvent).inputSource : undefined;
  private readonly selectStart = (event?: Event) => {
    if (!this.scanning || !this.ready || !this.canAcceptSelect(this.sourceOf(event))) return;
    this.pinchAt = performance.now();
  };
  private readonly selectEnd = () => {
    if (this.pinchAt <= 0) return;
    const held = performance.now() - this.pinchAt;
    this.pinchAt = 0;
    if (this.scanning && this.ready && held >= this.HOLD_MS) this.confirm = true;
    else this.report('hold-longer', 'Hold the pinch a little longer to plant the garden.');
  };
  private readonly select = (event?: Event) => {
    if (!this.scanning || !this.ready || !this.canAcceptSelect(this.sourceOf(event))) return;
    // Runtimes that emit selectstart/selectend prove the hold there; a bare
    // select is only a fallback for runtimes/emulators without those events.
    if (this.pinchAt > 0) return;
    this.confirm = true;
  };
  private readonly end = () => this.reset();

  constructor(private world: World,
    private onPose: (matrix: Matrix4, samples: SurfaceSamples | null, initial: boolean) => void,
    private onStatus: (state: string, message: string) => void,
    private onVisibility: (visible: boolean) => void,
    private canAcceptSelect: (source?: XRInputSource) => boolean = () => true,
  ) {}

  get hitTestAvailable(): boolean { return this.source !== null; }

  /** Re-open the required room scan after a measured route could not be built. */
  retryScan(): void { this.scan(); }

  private report(state: string, message: string): void {
    if (this.status === state) return;
    this.status = state;
    this.onStatus(state, message);
  }

  scan(): void {
    if (!this.session) { this.report('preview', 'Enter immersive mode, then choose Place in room.'); return; }
    this.generation++;
    this.anchor?.delete(); this.anchor = null;
    this.restoring = false; this.located = false; this.ready = false;
    this.scanning = true; this.confirm = false; this.pinchAt = 0;
    this.onVisibility(false);
    this.report('scanning', 'Look at a clear table or wall. Hold a pinch when the garden appears.');
  }

  confirmPlacement(): void {
    if (this.scanning && this.ready) this.confirm = true;
  }

  preview(): void {
    this.generation++;
    this.scanning = false; this.confirm = false; this.restoring = false; this.pinchAt = 0;
    this.anchor?.delete(); this.anchor = null;
    this.onVisibility(true);
    this.report('preview', 'PREVIEW ONLY — no room measured. Saved placement is kept for your next visit.');
  }

  reset(): void {
    this.generation++;
    this.source?.cancel(); this.source = null;
    this.session?.removeEventListener('select', this.select);
    this.session?.removeEventListener('selectstart', this.selectStart);
    this.session?.removeEventListener('selectend', this.selectEnd);
    this.session?.removeEventListener('end', this.end);
    this.anchor?.delete(); this.anchor = null;
    this.session = null; this.scanning = false; this.restoring = false;
    this.confirm = false; this.ready = false; this.located = false; this.pinchAt = 0;
    this.onVisibility(true);
    this.report('preview', 'Room scan required. Enter immersive mode, then look at a clear table or wall.');
  }

  private async connect(session: PersistentSession): Promise<void> {
    this.reset(); this.session = session;
    const generation = this.generation;
    session.addEventListener('select', this.select);
    session.addEventListener('selectstart', this.selectStart);
    session.addEventListener('selectend', this.selectEnd);
    session.addEventListener('end', this.end);
    try {
      const space = await session.requestReferenceSpace('viewer');
      const source = await session.requestHitTestSource?.({ space });
      if (this.session !== session) { source?.cancel(); return; }
      this.source = source ?? null;
    } catch { /* preview and restore remain available without hit testing */ }
    if (generation !== this.generation) return;
    let handle: string | null = null;
    try { handle = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
    if (!handle || !session.restorePersistentAnchor) {
      this.report('unplaced', 'A real surface is required. Scanning the room now...');
      return;
    }
    this.restoring = true; this.restoreDeadline = performance.now() + 10000;
    this.onVisibility(false);
    this.report('restoring', 'Finding your saved garden. Look around the room.');
    try {
      const anchor = await session.restorePersistentAnchor(handle);
      if (generation !== this.generation) { anchor.delete(); return; }
      this.anchor = anchor; this.saved = true;
    } catch {
      if (generation !== this.generation) return;
      this.restoring = false;
      this.report('restore-failed', 'Saved garden unavailable. Place it again or choose Use preview.');
    }
  }

  // Called only on a live XR frame. Do not retain frame/pose/hit objects.
  tick(frame: XRFrame): void {
    const session = frame.session as PersistentSession;
    if (this.session !== session) { void this.connect(session); return; }
    const space = this.world.xrReferenceSpace;
    if (!space) return;
    if (this.anchor) {
      const pose = frame.getPose(this.anchor.anchorSpace, space);
      if (pose) {
        this.matrix.fromArray(pose.transform.matrix);
        if (this.matrix.elements[5] < 0) this.matrix.multiply(this.flip);
        const initial = !this.located;
        if (initial) this.collect(frame, space);
        this.onPose(this.matrix, initial ? this.samples : null, initial);
        this.located = true; this.restoring = false;
        this.onVisibility(true);
        this.report(this.saved ? 'saved' : 'anchored', this.saved ? 'Garden saved on this device.' : 'Garden anchored for this session only.');
      } else {
        this.onVisibility(false);
        this.report('tracking-lost', 'Tracking paused. Look around to find the garden again.');
      }
    }
    if (this.restoring && performance.now() > this.restoreDeadline) {
      this.generation++; this.restoring = false;
      this.anchor?.delete(); this.anchor = null;
      this.report('restore-failed', 'Could not locate the saved garden. Place again or use preview.');
    }
    if (!this.scanning) return;
    if (!this.source) {
      this.confirm = false;
      this.report('no-hit-test', 'Surface hit-test unavailable on this device. A clearly labelled preview is available.');
      return;
    }
    this.ready = false;
    for (const hit of frame.getHitTestResults(this.source)) {
      const pose = hit.getPose(space);
      if (!pose) continue;
      this.matrix.fromArray(pose.transform.matrix);
      if (Math.abs(this.matrix.elements[5]) < 0.95) continue;
      if (this.matrix.elements[5] < 0) this.matrix.multiply(this.flip);
      this.point.setFromMatrixPosition(this.matrix);
      this.world.camera.getWorldPosition(this.viewer);
      if (this.point.distanceTo(this.viewer) > 2.5 || this.point.y < -0.05 || this.point.y > 1.4) continue;
      // If planes are supplied, the entire 68 cm bowl must fit inside one.
      if (frame.detectedPlanes?.size) {
        let fits = false;
        for (const plane of frame.detectedPlanes) {
          const planePose = frame.getPose(plane.planeSpace, space);
          if (!planePose || plane.orientation !== 'horizontal') continue;
          this.inverse.fromArray(planePose.transform.matrix).invert();
          this.local.copy(this.point).applyMatrix4(this.inverse);
          if (Math.abs(this.local.y) < 0.05 && insideSurface(this.local.x, this.local.z, plane.polygon, 0.35)) { fits = true; break; }
        }
        if (!fits) continue;
      }
      this.ready = true;
      this.onPose(this.matrix, null, false);
      this.onVisibility(true);
      this.report('surface-ready', 'Surface found. Hold a pinch to plant the garden here.');
      if (this.confirm) {
        this.confirm = false; this.scanning = false; this.located = true;
        this.collect(frame, space);
        this.onPose(this.matrix, this.samples, true);
        this.report('placed', 'Garden placed. Saving an anchor if supported...');
        const generation = this.generation;
        if (hit.createAnchor) void this.save(hit.createAnchor(), session, generation);
        else this.report('session-only', 'Garden placed for this session. Anchors unavailable.');
      }
      break;
    }
    if (this.scanning && !this.ready) {
      this.confirm = false; this.pinchAt = 0; this.onVisibility(false);
      this.report('scanning', 'Look at a clear table or wall. Hold a pinch when the garden appears.');
    }
  }

  private collect(frame: XRFrame, space: XRReferenceSpace): void {
    this.world.camera.getWorldPosition(this.viewer);
    this.world.camera.getWorldDirection(this.forward);
    this.samples.collect(frame, space, this.viewer, this.forward);
  }

  private async save(promise: Promise<XRAnchor>, session: PersistentSession, generation: number): Promise<void> {
    try {
      const anchor = await promise as PersistentAnchor;
      if (generation !== this.generation) { anchor.delete(); return; }
      this.anchor = anchor; this.saved = false;
      this.report('anchored', 'Garden anchored for this session only.');
      if (!anchor.requestPersistentHandle) return;
      const handle = await anchor.requestPersistentHandle();
      if (generation !== this.generation) {
        await session.deletePersistentAnchor?.(handle).catch(() => {}); return;
      }
      let old: string | null = null;
      try {
        old = localStorage.getItem(KEY);
        localStorage.setItem(KEY, handle);
      } catch {
        await session.deletePersistentAnchor?.(handle).catch(() => {});
        return;
      }
      this.saved = true;
      this.report('saved', 'Garden saved on this device.');
      if (old && old !== handle) await session.deletePersistentAnchor?.(old).catch(() => {});
    } catch {
      if (generation === this.generation) this.report('session-only', 'Garden placed for this session. Anchor saving unavailable.');
    }
  }
}
