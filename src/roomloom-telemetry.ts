import { classifySource, emptyInputSummary, observeSources,
  type InputClass, type InputSummary, type InputSourceLike } from './roomloom-input.js';
import { isLowFpsWindow, type RenderSnapshot } from './roomloom-performance.js';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export class PlaytestRecorder {
  readonly enabled = typeof location !== 'undefined' && params.has('test');
  readonly handsOnlyMode = typeof location !== 'undefined' && params.has('hands');
  private last = 0;
  private bucketTime = 0;
  private bucketFrames = 0;
  private intervals = new Float32Array(1800);
  private intervalCount = 0;
  private frames = 0;
  private activeSeconds = 0;
  private lowWindows = 0;
  private input: InputSummary = emptyInputSummary();
  private lastClass: InputClass = 'other';
  private render: RenderSnapshot = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  private peakCalls = 0;
  private qualityTier = 'full';
  private blockedControllerSelections = 0;
  private started = new Date().toISOString();
  private events: { event: string; seconds: number; detail: string; source: InputClass }[] = [];

  get consecutiveLowWindows(): number { return this.lowWindows; }
  get inputSummary(): InputSummary { return this.input; }
  get lastInputClass(): InputClass { return this.lastClass; }

  /** Attribute one WebXR selection to its exact source, not to a generic Pressed tag. */
  selection(source: XRInputSource | InputSourceLike | undefined, allowed: boolean): void {
    if (!this.enabled && !this.handsOnlyMode) return;
    const inputClass = classifySource(source);
    this.lastClass = inputClass;
    if (!allowed) this.blockedControllerSelections++;
    this.event('selection', inputClass, inputClass);
  }

  frame(now: number, session: XRSession, paused: boolean, render?: RenderSnapshot): void {
    if (!this.enabled && !this.handsOnlyMode) return;
    // Provenance is observed even while paused: a controller that appeared
    // during a pause still invalidates a hands-only field test.
    this.input = observeSources(this.input, session.inputSources as Iterable<InputSourceLike>);
    if (!this.enabled) return;
    if (render) {
      this.render = render;
      this.peakCalls = Math.max(this.peakCalls, render.calls);
    }
    if (paused || session.visibilityState !== 'visible') { this.last = 0; return; }
    if (this.last) {
      const dt = (now - this.last) / 1000;
      if (dt > 0 && dt < .25) {
        this.frames++; this.activeSeconds += dt; this.bucketTime += dt; this.bucketFrames++;
        if (this.bucketTime >= 1) {
          const fps = this.bucketFrames / this.bucketTime;
          this.intervals[this.intervalCount++ % this.intervals.length] = fps;
          this.lowWindows = isLowFpsWindow(fps) ? this.lowWindows + 1 : 0;
          this.bucketTime = 0; this.bucketFrames = 0;
        }
      }
    }
    this.last = now;
  }

  event(event: string, detail = '', source: InputClass = this.lastClass): void {
    if (this.enabled && this.events.length < 500) {
      this.events.push({ event, seconds: this.activeSeconds, detail, source });
    }
  }

  setQualityTier(name: string): void {
    this.qualityTier = name;
    this.lowWindows = 0;
    this.event('quality-tier', name);
  }

  save(): boolean {
    if (!this.enabled) return false;
    const fps = Array.from(this.intervals.slice(0, Math.min(this.intervalCount, this.intervals.length)));
    const report = {
      version: 2, started: this.started, saved: new Date().toISOString(), url: location.href,
      userAgent: navigator.userAgent,
      environment: 'UNVERIFIED: identify physical headset or emulator in tester notes',
      activeSeconds: this.activeSeconds, frames: this.frames,
      averageFps: this.activeSeconds ? this.frames / this.activeSeconds : null,
      minimumOneSecondFps: fps.length ? Math.min(...fps) : null,
      secondsBelow60: fps.filter(f => f < 60).length,
      samples: fps,
      drawCalls: this.render.calls, peakDrawCalls: this.peakCalls,
      triangles: this.render.triangles, geometries: this.render.geometries, textures: this.render.textures,
      qualityTier: this.qualityTier,
      handsOnlyMode: this.handsOnlyMode,
      handSourcesSeen: this.input.handSourcesSeen,
      controllerSourcesSeen: this.input.controllerSourcesSeen,
      gazeSourcesSeen: this.input.gazeSourcesSeen,
      handsOnlySession: this.input.handsOnlySession,
      blockedControllerSelections: this.blockedControllerSelections,
      roomPlacements: this.events.filter(e => e.event === 'room-route' || e.event === 'room-scan-failed').length,
      fallbacks: this.events.filter(e => e.event === 'fallback' || e.event === 'preview-demo').length,
      events: this.events,
    };
    try {
      const raw = JSON.parse(localStorage.getItem('roomloom.playtests.v1') ?? '[]');
      const reports = Array.isArray(raw) ? raw : [];
      const existing = reports.findIndex((r: { started?: string }) => r.started === this.started);
      if (existing >= 0) reports[existing] = report; else reports.push(report);
      localStorage.setItem('roomloom.playtests.v1', JSON.stringify(reports.slice(-10)));
      return true;
    } catch { return false; }
  }
}
