// Presentation and progression logic with no runtime dependencies.

export interface TextStyle { color: string; backgroundColor?: string; fontSize?: number }

/** Every text-bearing panel element gets a value in both modes. */
export const CONTRAST_IDS = [
  'TitleText', 'SpeciesText', 'StoryText', 'ProgressText', 'HintText',
  'GardenText', 'RelayText', 'PlacementText', 'CapabilityText', 'TutorialLabel', 'TestText',
] as const;

/** Buttons and the progress card also get near-black/near-white treatment. */
export const CONTRAST_BUTTON_IDS = [
  'RelayAButton', 'RelayBButton', 'UndoButton', 'PlaceButton', 'PreviewButton',
  'StartButton', 'ContrastButton', 'TutorialButton', 'PauseButton', 'TestButton',
] as const;

export function contrastButtonColor(enabled: boolean): string {
  return enabled ? '#001b26' : '#19362e';
}

export function contrastPalette(enabled: boolean): Record<string, TextStyle & { prefix: string }> {
  // Redundant shape cue: high contrast is never communicated by colour alone.
  const prefix = enabled ? '■ ' : '';
  const style = (color: string, fontSize: number, hc: string = '#ffffff'): TextStyle & { prefix: string } =>
    ({ color: enabled ? hc : color, fontSize: enabled ? fontSize + 2 : fontSize, prefix });
  const result: Record<string, TextStyle & { prefix: string }> = {};
  for (const id of CONTRAST_IDS) result[id] = style('#35594c', 12);
  result.TitleText = style('#173c31', 26);
  result.SpeciesText = style('#255d49', 12, '#ffe17a');
  result.ProgressText = style('#ffd778', 22);
  result.HintText = style('#e7f7ef', 14);
  return result;
}

export function contrastCardColor(enabled: boolean, complete: boolean): string {
  if (complete) return enabled ? '#5a4300' : '#6a4d12';
  return enabled ? '#001b26' : '#19362e';
}

export function contrastEmissive(enabled: boolean, species: number): { color: number; intensity: number } {
  return enabled ? { color: 0x237b94, intensity: 0.8 } : { color: species ? 0x59417c : 0xbb7d21, intensity: 0.4 };
}

// ---- Guided, diegetic onboarding ------------------------------------------------

export type TutorialStep = 0 | 1 | 2 | 3;
export type TutorialAction = 'look' | 'pinch' | 'arrive' | 'skip' | 'replay';

export function advanceTutorial(step: TutorialStep, action: TutorialAction): TutorialStep {
  if (action === 'replay') return 0;
  if (action === 'skip') return 3;
  if (step === 0 && action === 'look') return 1;
  if (step === 1 && action === 'pinch') return 2;
  if (step === 2 && action === 'arrive') return 3;
  return step;
}

export interface TutorialCopy { title: string; story: string; hint: string; progress: string }
export function tutorialCopy(step: TutorialStep): TutorialCopy {
  switch (step) {
    case 0: return { title: 'A light needs a home.',
      story: 'One small light survived the dark. Look at it with your hand ray or your eyes.',
      hint: 'Step 1 of 3 · Look at the glowing light. Nothing to press yet.',
      progress: 'Welcome the first light' };
    case 1: return { title: 'Offer it a home.',
      story: 'It is waiting for you. A gentle pinch is all it takes.',
      hint: 'Step 2 of 3 · Point at the light and pinch. Stay seated.',
      progress: 'One pinch away' };
    case 2: return { title: 'Watch it fly home.',
      story: 'The light is finding its way through your room.',
      hint: 'Step 3 of 3 · Watch the plant grow from your table.',
      progress: 'A garden begins' };
    default: return { title: 'A light needs a home.', story: '', hint: '', progress: '' };
  }
}

// ---- Gentle score and round summary ---------------------------------------------

export interface ScoreInput {
  found: number;
  total: number;
  hops: number;
  moves: number;
  undos: number;
  elapsedSeconds: number;
}

/** Always winnable. Efficiency is rewarded; waiting is never punished with a fail. */
export function computeScore(input: ScoreInput): number {
  const { found, total, hops, moves, undos, elapsedSeconds } = input;
  const base = 600 + Math.round((found / Math.max(1, total)) * 400);
  const penalty = hops * 25 + moves * 35 + undos * 15 + Math.round(Math.max(0, elapsedSeconds) * 1.5);
  return Math.max(100, Math.min(1000, base - penalty));
}

export function scoreGrade(score: number): string {
  if (score >= 850) return 'Radiant';
  if (score >= 650) return 'Bright';
  return 'Gentle';
}

/** Replay cannot farm a new personal best on a day already completed. */
export function updateBestScore(previous: number, candidate: number, newDay: boolean): number {
  if (!newDay) return previous;
  return Math.max(Number.isSafeInteger(previous) && previous > 0 ? previous : 0, candidate);
}

export function roundSummary(score: number, best: number, residents: number, streak: number, tomorrow: string): string {
  return `Lightkeeping: ${score}/1000 (${scoreGrade(score)}). Best ${best}. ${residents} residents, ${streak}-day streak. Tomorrow: ${tomorrow}.`;
}
