// Pure, side-effect-free competition logic: input provenance and capability probes.
// Kept free of World/DOM imports so it can be exercised by node:test fixtures.

export type InputClass = 'hand' | 'controller' | 'gaze' | 'other';

export interface InputSourceLike {
  hand?: unknown;
  gamepad?: unknown;
  targetRayMode?: string;
  handedness?: string;
}

/** Classify a WebXR input source using only standard XRSession fields. */
export function classifySource(source: InputSourceLike | null | undefined): InputClass {
  if (!source) return 'other';
  if (source.hand) return 'hand';
  if (source.targetRayMode === 'gaze') return 'gaze';
  if (source.gamepad || source.targetRayMode === 'tracked-pointer') return 'controller';
  return 'other';
}

/** Stable identity of a source across frames (inputSources is rebuilt every frame). */
export function sourceKey(source: InputSourceLike): string {
  const kind = source.hand ? 'hand' : source.gamepad ? 'pad' : 'none';
  return `${source.targetRayMode ?? 'unknown'}:${source.handedness ?? 'none'}:${kind}`;
}

export interface InputSummary {
  handSourcesSeen: number;
  controllerSourcesSeen: number;
  gazeSourcesSeen: number;
  otherSourcesSeen: number;
  handsOnlySession: boolean;
  keys: string[];
}

export function emptyInputSummary(): InputSummary {
  return { handSourcesSeen: 0, controllerSourcesSeen: 0, gazeSourcesSeen: 0,
    otherSourcesSeen: 0, handsOnlySession: false, keys: [] };
}

/**
 * Accumulate UNIQUE sources over the whole session. Counting per frame only ever
 * proved "> 0"; a Set is what makes "no controller was ever present" provable.
 */
export function observeSources(summary: InputSummary, sources: Iterable<InputSourceLike>): InputSummary {
  const keys = new Set(summary.keys);
  let hand = summary.handSourcesSeen;
  let controller = summary.controllerSourcesSeen;
  let gaze = summary.gazeSourcesSeen;
  let other = summary.otherSourcesSeen;
  for (const source of sources) {
    const key = sourceKey(source);
    if (keys.has(key)) continue;
    keys.add(key);
    switch (classifySource(source)) {
      case 'hand': hand++; break;
      case 'controller': controller++; break;
      case 'gaze': gaze++; break;
      default: other++;
    }
  }
  return { handSourcesSeen: hand, controllerSourcesSeen: controller,
    gazeSourcesSeen: gaze, otherSourcesSeen: other,
    // Gaze may legitimately accompany hands; controllers may not.
    handsOnlySession: hand > 0 && controller === 0, keys: [...keys] };
}

/**
 * Hands-only enforcement for `?hands=1` field tests. A controller present at
 * any point in the session invalidates the run, as does a non-hand selection.
 */
export function handsOnlyAllowed(summary: InputSummary, enforced: boolean, lastClass: InputClass): boolean {
  if (!enforced) return true;
  if (summary.controllerSourcesSeen > 0) return false;
  return lastClass === 'hand' || lastClass === 'gaze';
}

export function handsOnlyMessage(summary: InputSummary): string {
  return summary.controllerSourcesSeen > 0
    ? 'Hands-only test: unpair controllers and restart the session.'
    : 'Hands-only test: point with your hand (or eyes) and pinch.';
}

export interface CapabilitySignals {
  enabledFeatures?: readonly string[] | null;
  inputSources?: Iterable<InputSourceLike>;
  planesVisible?: boolean;
  meshesVisible?: boolean;
  hitTestAvailable?: boolean;
  persistentAnchorsAvailable?: boolean;
}

export interface CapabilityReport {
  handTracking: boolean;
  gaze: boolean;
  planes: boolean;
  meshes: boolean;
  hitTest: boolean;
  anchors: boolean;
  missing: string[];
  message: string;
}

/** Report what the runtime GRANTED, not what iwsdk.config.json requested. */
export function capabilityReport(signals: CapabilitySignals): CapabilityReport {
  const features = (signals.enabledFeatures ?? []).map(f => f.toLowerCase());
  const has = (...names: string[]) => names.some(n => features.some(f => f.includes(n)));
  const sources = signals.inputSources ? [...signals.inputSources] : [];
  const handTracking = has('hand-tracking', 'handtracking') || sources.some(s => !!s.hand);
  const gaze = has('eye-tracking', 'eyetracking', 'gaze') || sources.some(s => s.targetRayMode === 'gaze');
  const planes = signals.planesVisible === true || has('plane-detection');
  const meshes = signals.meshesVisible === true || has('mesh-detection');
  const hitTest = signals.hitTestAvailable === true || has('hit-test');
  const anchors = signals.persistentAnchorsAvailable === true || has('anchors', 'persistent-anchor');
  const missing: string[] = [];
  if (!handTracking) missing.push('hand tracking');
  if (!planes && !meshes) missing.push('room surfaces');
  if (!hitTest) missing.push('surface hit-test');
  const message = missing.length
    ? `Limited room features: ${missing.join(', ')} unavailable. Place in room needs a Quest with scene understanding.`
    : 'Room features granted: hands, surfaces, hit-test' + (gaze ? ', gaze' : '') + (anchors ? ', anchors' : '') + '.';
  return { handTracking, gaze, planes, meshes, hitTest, anchors, missing, message };
}
