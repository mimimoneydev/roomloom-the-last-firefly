export const SPECIES = ['Lumen fireflies', 'Moon moths'] as const;

// Calendar arithmetic in UTC on local date parts avoids 23/25-hour DST days.
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function dailySpecies(date = new Date()): number {
  return ((dayNumber(date) % SPECIES.length) + SPECIES.length) % SPECIES.length;
}

export interface Progress { day: number; streak: number }

export function advanceProgress(previous: Progress | null, date: Date): Progress {
  const day = dayNumber(date);
  const valid = previous && Number.isSafeInteger(previous.day) &&
    Number.isSafeInteger(previous.streak) && previous.streak > 0;
  if (valid && previous.day === day) return previous;
  return { day, streak: valid && previous.day === day - 1 ? previous.streak + 1 : 1 };
}

export function recordVisit(storage: Pick<Storage, 'getItem' | 'setItem'>, date = new Date()): Progress {
  let previous: Progress | null = null;
  try { previous = JSON.parse(storage.getItem('roomloom.progress.v2') ?? 'null'); } catch { /* fresh history */ }
  // The old counter did not prove consecutive dates, so it cannot be migrated as a streak.
  const progress = advanceProgress(previous, date);
  try { storage.setItem('roomloom.progress.v2', JSON.stringify(progress)); } catch { /* session still completes */ }
  return progress;
}
