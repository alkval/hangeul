import { entries, type Entry, type Group } from './data.ts';
export const EXAM_OPENS = Date.parse('2026-10-12T08:00:00+02:00');
export const examIsOpen = (now = Date.now()) => Number.isFinite(now) && now >= EXAM_OPENS;
export type Direction = 'read' | 'write';
export function normalize(text: string): string { return text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,''); }
export function correctAnswer(entry: Entry, answer: string, direction: Direction): boolean {
  if (direction === 'write') return normalize(entry.glyph) === normalize(answer);
  return entry.aliases.some(alias => normalize(alias) === normalize(answer));
}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i=result.length-1; i>0; i--) {
    const bytes = new Uint32Array(1); let random: number;
    const bound = i+1, limit = Math.floor(0x100000000/bound)*bound;
    do { crypto.getRandomValues(bytes); random = bytes[0]; } while (random >= limit);
    const j = random % bound; [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
export const poolFor = (selected: Group[]) => entries.filter(entry => selected.includes(entry.group));
export function optionsFor(entry: Entry, pool: Entry[], direction: Direction): Entry[] {
  const candidates = pool.filter(other => other.id !== entry.id && (direction === 'write' ||
    !other.aliases.some(alias => entry.aliases.some(answer => normalize(answer) === normalize(alias)))));
  const unique = candidates.filter((other,index,list) => list.findIndex(item =>
    (direction === 'write' ? item.glyph === other.glyph : item.roman === other.roman)) === index);
  return shuffle([entry,...shuffle(unique).slice(0,3)]);
}
export interface ItemStats { attempts: number; correct: number; streak: number; mastered: boolean; needsPractice?: boolean; }
export interface Progress { version: 1; answered: number; correct: number; streak: number; best: number; exams: number; items: Record<string,ItemStats>; }
export const freshProgress = (): Progress => ({version:1,answered:0,correct:0,streak:0,best:0,exams:0,items:{}});
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw || 'null');
    if (!p || p.version !== 1 || !['answered','correct','streak','best','exams'].every(k=>integer(p[k])) || p.correct>p.answered || p.streak>p.correct || p.best>p.correct || !p.items || typeof p.items!=='object' || Array.isArray(p.items)) return freshProgress();
    const safeItems: Progress['items'] = {};
    for (const entry of entries) {
      const s = p.items[entry.id];
      if (s && integer(s.attempts) && integer(s.correct) && integer(s.streak) && s.correct<=s.attempts && s.streak<=s.correct && typeof s.mastered==='boolean') safeItems[entry.id]=s;
    }
    return {...p,items:safeItems};
  } catch { return freshProgress(); }
}
export function recordAnswer(p: Progress, id: string, correct: boolean): Progress {
  const old = p.items[id] || {attempts:0,correct:0,streak:0,mastered:false};
  const streak = correct ? p.streak+1 : 0, itemStreak = correct ? old.streak+1 : 0;
  return {...p,answered:p.answered+1,correct:p.correct+Number(correct),streak,best:Math.max(p.best,streak),
    items:{...p.items,[id]:{attempts:old.attempts+1,correct:old.correct+Number(correct),streak:itemStreak,mastered:correct ? old.mastered || itemStreak>=3 : false}}};
}
