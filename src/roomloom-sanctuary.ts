import { dayNumber } from './roomloom-progress.js';
export const SANCTUARY_KEY = 'roomloom.sanctuary.v1';
export interface Sanctuary {
  version: 1; residents: string[]; discoveries: string[]; days: number[];
  introDone: boolean; contrast: boolean; bestScore: number; bestGrade: string;
}
export function freshSanctuary(): Sanctuary {
  return { version: 1, residents: [], discoveries: [], days: [],
    introDone: false, contrast: false, bestScore: 0, bestGrade: '' };
}
export function readSanctuary(storage: Pick<Storage, 'getItem'>): Sanctuary {
  try {
    const s = JSON.parse(storage.getItem(SANCTUARY_KEY) ?? 'null');
    if (s?.version !== 1) return freshSanctuary();
    const strings = (a: unknown): string[] => Array.isArray(a) ? [...new Set(a.filter((v): v is string => typeof v === 'string' && v.length < 80))].slice(-365) : [];
    return { version: 1, residents: strings(s.residents), discoveries: strings(s.discoveries),
      days: Array.isArray(s.days) ? [...new Set<number>(s.days.filter(Number.isSafeInteger))].slice(-365) : [],
      introDone: s.introDone === true, contrast: s.contrast === true,
      bestScore: Number.isSafeInteger(s.bestScore) && s.bestScore >= 0 && s.bestScore <= 1000 ? s.bestScore : 0,
      bestGrade: typeof s.bestGrade === 'string' && s.bestGrade.length <= 12 ? s.bestGrade : '' };
  } catch { return freshSanctuary(); }
}
export function saveSanctuary(storage: Pick<Storage, 'setItem'>, sanctuary: Sanctuary): boolean {
  try { storage.setItem(SANCTUARY_KEY, JSON.stringify(sanctuary)); return true; } catch { return false; }
}
// One resident per daily rescue slot. Replay is rewarding without farming growth.
export function rescueResident(s: Sanctuary, species: string, slot: number, date = new Date()): boolean {
  const day = dayNumber(date), id = `${day}:${slot}`;
  if (s.residents.includes(id)) return false;
  s.residents.push(id);
  if (!s.discoveries.includes(species)) s.discoveries.push(species);
  if (!s.days.includes(day)) s.days.push(day);
  s.introDone = true;
  return true;
}
export function gardenStage(s: Sanctuary): number {
  return s.residents.length >= 9 ? 4 : s.residents.length >= 6 ? 3 : s.residents.length >= 3 ? 2 : s.residents.length ? 1 : 0;
}
export function nextObjective(s: Sanctuary): string {
  const n = s.residents.length;
  if (!n) return 'Help the last light find a home.';
  if (n < 3) return `${3 - n} more residents will awaken the first flower.`;
  if (n < 6) return `${6 - n} more residents will grow a moonflower grove.`;
  if (n < 9) return `${9 - n} more residents will transform the sanctuary.`;
  return 'Your sanctuary is alive. Welcome another daily visitor.';
}
