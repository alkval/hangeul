import { entries, type Entry, type Group } from './data.ts';
export const EXAM_OPENS = Date.parse('2026-10-12T08:00:00+02:00');
export const EXAM_QUESTION_MS = 5000;
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
const letterFamilies = ['ㄱㄲㅋ','ㄷㄸㅌ','ㅂㅃㅍ','ㅅㅆ','ㅈㅉㅊ','ㄴㄹ','ㅁㅇㅎ',
  'ㅏㅑㅓㅕ','ㅗㅛㅜㅠ','ㅐㅒㅔㅖ','ㅡㅣㅢ','ㅘㅙㅚ','ㅝㅞㅟ'];
function kind(group: Group): string {
  return group==='consonants'||group==='tense'?'consonant':group==='vowels'||group==='extra'?'vowel':'syllable';
}
function editDistance(a: string,b: string): number {
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=0;i<a.length;i++){
    const next=[i+1];
    for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+Number(a[i]!==b[j])));
    row=next;
  }
  return row[b.length];
}
function syllableParts(glyph: string): number[]|null {
  const code=glyph.codePointAt(0)!-0xAC00;
  return glyph.length===1&&code>=0&&code<11172?[Math.floor(code/588),Math.floor(code/28)%21,code%28]:null;
}
function similarity(a: Entry,b: Entry,direction: Direction): number {
  const roman=Math.max(...a.aliases.flatMap(x=>b.aliases.map(y=>{
    const left=normalize(x),right=normalize(y);
    return 1-editDistance(left,right)/Math.max(left.length,right.length,1);
  })));
  const family=letterFamilies.some(letters=>letters.includes(a.glyph)&&letters.includes(b.glyph))?1:0;
  const left=syllableParts(a.glyph),right=syllableParts(b.glyph);
  const shared=left&&right?Number(left[0]===right[0])+Number(left[1]===right[1])+Number(left[2]!==0&&left[2]===right[2]):0;
  return roman*(direction==='read'?3:1)+family*(direction==='write'?3:1)+shared*2;
}
export function optionsFor(entry: Entry, pool: Entry[], direction: Direction): Entry[] {
  const candidates = pool.filter(other => other.id !== entry.id &&
    !other.aliases.some(alias => entry.aliases.some(answer => normalize(answer) === normalize(alias))));
  const unique = candidates.filter((other,index,list) => list.findIndex(item =>
    (direction === 'write' ? item.glyph === other.glyph : item.roman === other.roman)) === index);
  const sameGroup=unique.filter(other=>other.group===entry.group);
  const sameKind=unique.filter(other=>kind(other.group)===kind(entry.group));
  const candidatesByType=sameGroup.length>=3?sameGroup:sameKind.length>=3?sameKind:unique;
  // Mix two related distractors with a more distinct one, rather than three near twins.
  const ranked=shuffle(candidatesByType).sort((a,b)=>similarity(entry,b,direction)-similarity(entry,a,direction));
  const first=shuffle(ranked.slice(0,2))[0];
  const second=shuffle(ranked.slice(0,5).filter(other=>other!==first))[0];
  const remaining=ranked.filter(other=>other!==first&&other!==second);
  const easier=shuffle(remaining.slice(Math.floor(remaining.length/2)))[0];
  return shuffle([entry,...[first,second,easier].filter((other):other is Entry=>!!other)]);
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
