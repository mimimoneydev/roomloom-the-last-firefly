// Frame-budget and FoV logic, kept pure so device claims can be unit tested.

export interface RenderSnapshot {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

export interface QualityTier {
  name: 'full' | 'balanced' | 'minimal';
  pixelRatio: number;
  maxResidents: number;
  animateWings: boolean;
  emissivePulse: boolean;
}

export const QUALITY_TIERS: readonly QualityTier[] = [
  { name: 'full', pixelRatio: 1, maxResidents: 3, animateWings: true, emissivePulse: true },
  { name: 'balanced', pixelRatio: 0.85, maxResidents: 2, animateWings: true, emissivePulse: false },
  { name: 'minimal', pixelRatio: 0.7, maxResidents: 1, animateWings: false, emissivePulse: false },
];

/** Step down one tier only after two consecutive sub-60 one-second windows. */
export function nextQualityTier(current: number, lowWindows: number): number {
  if (lowWindows < 2) return current;
  return Math.min(QUALITY_TIERS.length - 1, current + 1);
}

/**
 * Keep the reading panel at a constant angular size. A narrower vertical FoV
 * (Meta VR Glasses) needs a larger distance than Quest 3 so the panel still
 * fits inside the usable field of view instead of filling or clipping it.
 */
export function fovPanelDistance(fovDegrees: number, referenceFov = 90, referenceDistance = 1.8): number {
  if (!Number.isFinite(fovDegrees) || fovDegrees <= 0) return referenceDistance;
  const fov = Math.max(35, Math.min(120, fovDegrees));
  const scale = Math.tan((referenceFov * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
  return Math.max(1.15, Math.min(3.2, referenceDistance * scale));
}

/** True when a one-second sample should count towards a quality step-down. */
export function isLowFpsWindow(fps: number, target = 60): boolean {
  return Number.isFinite(fps) && fps > 0 && fps < target;
}
