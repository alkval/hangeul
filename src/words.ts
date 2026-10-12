import { FINALS, INITIALS, MEDIALS, spellSyllable } from './data.ts';
import { shuffle } from './engine.ts';
import type { Language } from './copy.ts';

export type WordCategory = 'useful' | 'loans' | 'names' | 'batchim' | 'changes';
export type WordMode = 'mix' | Exclude<WordCategory, 'useful'>;
type Localized = readonly [string, string, string];
export type WordRule = keyof typeof wordRules;
export interface WordEntry {
  id: string;
  glyph: string;
  pronunciation: string;
  meaning: Localized;
  categories: WordCategory[];
  rule?: WordRule;
  source: string;
}
export const wordCategories: WordCategory[] = ['useful', 'loans', 'names', 'batchim', 'changes'];
export const wordModes: WordMode[] = ['mix', 'loans', 'names', 'batchim', 'changes'];
export const localizedWordText = (text: Localized, lang: Language) => text[lang === 'nb' ? 0 : lang === 'en' ? 1 : 2];
export const wordLabels = {
  mix: ['Blandet', 'Mixed', '골고루'],
  useful: ['Nyttige ord', 'Useful words', '생활 단어'],
  loans: ['Engelske låneord', 'English loanwords', '영어에서 온 말'],
  names: ['Navn', 'Names', '이름'],
  batchim: ['받침 · sluttkonsonanter', '받침 · final consonants', '받침 규칙'],
  changes: ['Lydendringer', 'Sound changes', '발음 변화'],
} satisfies Record<WordCategory | WordMode, Localized>;
// Original, short explanations of standard pronunciation rules. Long-vowel marks
// are omitted here; this is a beginner reading aid, not an IPA transcription.
export const wordRules = {
  finalK: ['Slutt-ㄱ, ㄲ og ㅋ blir en kort k-lyd. Ingen ekstra vokal etterpå.', 'Final ㄱ, ㄲ and ㅋ become a short k sound. Do not add a vowel.', '받침 ㄱ, ㄲ, ㅋ은 [ㄱ]으로 발음합니다. 뒤에 모음을 붙이지 않습니다.'],
  finalT: ['Slutt-ㅅ, ㅈ, ㅊ og ㅌ blir en kort t-lyd.', 'Final ㅅ, ㅈ, ㅊ and ㅌ become a short t sound.', '받침 ㅅ, ㅈ, ㅊ, ㅌ은 [ㄷ]으로 발음합니다.'],
  finalP: ['Slutt-ㅂ og ㅍ blir en kort p-lyd. Leppene lukkes uten en ekstra vokal.', 'Final ㅂ and ㅍ become a short p sound. Close the lips without adding a vowel.', '받침 ㅂ, ㅍ은 [ㅂ]으로 발음합니다. 모음을 붙이지 않고 입술을 닫습니다.'],
  finalN: ['ㄴ nederst i stavelsen uttales n.', 'Final ㄴ is pronounced n.', '받침 ㄴ은 [ㄴ]으로 발음합니다.'],
  finalL: ['ㄹ nederst i stavelsen uttales l.', 'Final ㄹ is pronounced l.', '받침 ㄹ은 [ㄹ]로 발음합니다.'],
  finalM: ['ㅁ nederst i stavelsen uttales m.', 'Final ㅁ is pronounced m.', '받침 ㅁ은 [ㅁ]으로 발음합니다.'],
  finalNg: ['ㅇ nederst i stavelsen uttales ng. Først i en stavelse er ㅇ stum.', 'Final ㅇ is pronounced ng. Initial ㅇ is silent.', '받침 ㅇ은 [ㅇ]으로 발음합니다. 초성 ㅇ은 소리가 없습니다.'],
  liaison: ['I dette ordet knyttes sluttkonsonanten til vokalen i neste stavelse. ㅇ først i neste stavelse er stum.', 'In this word, the final consonant links to the next syllable’s vowel. Initial ㅇ in that syllable is silent.', '이 단어에서는 받침을 다음 음절의 첫소리로 옮겨 발음합니다. 초성 ㅇ은 소리가 없습니다.'],
  nasalK: ['ㄱ foran ㄴ eller ㅁ blir ng (ㅇ).', 'ㄱ before ㄴ or ㅁ becomes ng (ㅇ).', '받침 ㄱ은 ㄴ, ㅁ 앞에서 [ㅇ]으로 바뀝니다.'],
  nasalP: ['ㅂ foran ㄴ eller ㅁ blir m (ㅁ).', 'ㅂ before ㄴ or ㅁ becomes m (ㅁ).', '받침 ㅂ은 ㄴ, ㅁ 앞에서 [ㅁ]으로 바뀝니다.'],
  nasalT: ['En slutt-t foran ㄴ eller ㅁ blir n (ㄴ).', 'A final t sound before ㄴ or ㅁ becomes n (ㄴ).', '받침의 [ㄷ] 소리는 ㄴ, ㅁ 앞에서 [ㄴ]으로 바뀝니다.'],
  liquid: ['ㄴ ved siden av ㄹ blir l: kombinasjonen høres ut som ll.', 'ㄴ next to ㄹ becomes l: the combination sounds like ll.', 'ㄹ 앞이나 뒤의 ㄴ은 [ㄹ]로 바뀝니다.'],
  tense: ['Konsonanten etter en slutt-k, -t eller -p blir ofte spent: ㄲ, ㄸ, ㅃ, ㅆ eller ㅉ.', 'After final k, t or p, the following plain consonant often becomes tense: ㄲ, ㄸ, ㅃ, ㅆ or ㅉ.', '받침 [ㄱ], [ㄷ], [ㅂ] 뒤의 예사소리는 된소리로 바뀝니다.'],
  aspirated: ['ㅎ og neste konsonant slås sammen til en konsonant med mer pust: ㅋ, ㅌ, ㅍ eller ㅊ.', 'ㅎ combines with the adjacent consonant to form an aspirated ㅋ, ㅌ, ㅍ or ㅊ.', 'ㅎ과 이웃한 자음이 합쳐져 ㅋ, ㅌ, ㅍ, ㅊ으로 발음됩니다.'],
  silentH: ['ㅎ faller bort foran en vokalendelse.', 'ㅎ is dropped before a vowel ending.', '모음으로 시작하는 어미 앞에서 ㅎ이 탈락합니다.'],
  palatal: ['Slutt-ㄷ eller -ㅌ foran endelsen 이 blir j eller ch (ㅈ eller ㅊ).', 'Final ㄷ or ㅌ before the ending 이 becomes j or ch (ㅈ or ㅊ).', '받침 ㄷ, ㅌ은 모음 ㅣ로 시작하는 조사나 접미사 앞에서 ㅈ, ㅊ으로 바뀝니다.'],
  doubleK: ['Dobbel sluttkonsonant ㄺ forenkles til k her; neste ㄷ blir spent ㄸ.', 'The double final ㄺ simplifies to k here; the following ㄷ becomes tense ㄸ.', '여기서는 겹받침 ㄺ을 [ㄱ]으로 발음하고 뒤의 ㄷ은 ㄸ으로 바뀝니다.'],
  doubleP: ['Dobbel sluttkonsonant ㅄ blir p her; neste ㄷ blir spent ㄸ.', 'The double final ㅄ becomes p here; the following ㄷ becomes tense ㄸ.', '여기서는 겹받침 ㅄ을 [ㅂ]으로 발음하고 뒤의 ㄷ은 ㄸ으로 바뀝니다.'],
  doubleN: ['Dobbel sluttkonsonant ㄵ blir n her; neste ㄷ blir spent ㄸ.', 'The double final ㄵ becomes n here; the following ㄷ becomes tense ㄸ.', '여기서는 겹받침 ㄵ을 [ㄴ]으로 발음하고 뒤의 ㄷ은 ㄸ으로 바뀝니다.'],
  doubleL: ['Dobbel sluttkonsonant ㄼ blir l i dette ordet.', 'The double final ㄼ becomes l in this word.', '이 단어에서는 겹받침 ㄼ을 [ㄹ]로 발음합니다.'],
  addedN: ['I dette sammensatte ordet legges n til foran 잎. Slutt-t blir så n: 꽃잎 → 꼰닙.', 'This compound adds n before 잎. The final t then becomes n: 꽃잎 → 꼰닙.', '이 합성어에서는 잎 앞에 ㄴ이 첨가되고 앞 받침이 ㄴ으로 바뀝니다: 꽃잎 → 꼰닙.'],
  nasalLiquid: ['ㄹ blir n etter denne konsonanten, og slutt-k blir ng: 독립 → 동닙.', 'ㄹ becomes n after this consonant, and final k becomes ng: 독립 → 동닙.', 'ㄹ이 ㄴ으로 바뀌고 앞 받침 ㄱ이 ㅇ으로 바뀝니다: 독립 → 동닙.'],
} satisfies Record<string, Localized>;

const headwords: Record<string, string> = { '꽃이': '꽃', '먹는': '먹다', '있는': '있다', '좋아요': '좋다' };
const dictionary = (glyph: string) => `https://krdict.korean.go.kr/eng/dicSearch/search?mainSearchWord=${encodeURIComponent(headwords[glyph] || glyph)}`;
const pronunciationRules = 'https://www.korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0002';
function word(glyph: string, pronunciation: string, meaning: Localized, categories: WordCategory[], rule?: WordRule): WordEntry {
  return { id: glyph, glyph, pronunciation, meaning, categories, rule, source: categories.includes('names') ? pronunciationRules : dictionary(glyph) };
}
const loan = (glyph: string, meaning: string, pronunciation = glyph) => word(glyph, pronunciation, [meaning, meaning, meaning], ['loans']);
const name = (glyph: string, meaning: string, pronunciation = glyph) => word(glyph, pronunciation, [meaning, meaning, meaning], ['names']);
const useful = (glyph: string, nb: string, en: string, ko: string) => word(glyph, glyph, [nb, en, ko], ['useful']);
const ruleWord = (glyph: string, pronunciation: string, nb: string, en: string, ko: string, rule: WordRule, changed = true) => word(glyph, pronunciation, [nb, en, ko], changed ? ['batchim', 'changes'] : ['batchim'], rule);

export const words: WordEntry[] = [
  loan('커피', 'Coffee'), loan('티셔츠', 'T-shirt'), loan('버스', 'Bus'), loan('택시', 'Taxi'),
  loan('컴퓨터', 'Computer'), loan('인터넷', 'Internet', '인터넫'), loan('카메라', 'Camera'),
  loan('초콜릿', 'Chocolate', '초콜릳'), loan('아이스크림', 'Ice cream'), loan('스포츠', 'Sports'),
  loan('게임', 'Game'), loan('스마트폰', 'Smartphone'), loan('키보드', 'Keyboard'),
  loan('샌드위치', 'Sandwich'), loan('팝콘', 'Popcorn', '팝콘'), loan('주스', 'Juice'),
  name('마이클', 'Michael'), name('해리 포터', 'Harry Potter'), name('엠마', 'Emma'),
  name('올리버', 'Oliver'), name('알렉산더', 'Alexander'), name('소피아', 'Sophia'),
  name('안나', 'Anna'), name('엘사', 'Elsa'), name('올라프', 'Olaf'), name('마리오', 'Mario'),
  name('피카츄', 'Pikachu'), name('배트맨', 'Batman'), name('지민', 'Jimin'), name('민수', 'Minsu'),
  useful('사랑', 'kjærlighet', 'love', '사랑'), useful('친구', 'venn', 'friend', '친구'),
  useful('바다', 'hav', 'sea', '바다'), useful('나무', 'tre', 'tree', '나무'),
  useful('우유', 'melk', 'milk', '우유'), useful('오이', 'agurk', 'cucumber', '오이'),
  useful('가게', 'butikk', 'shop', '가게'), useful('사과', 'eple', 'apple', '사과'),
  useful('아기', 'baby', 'baby', '아기'), useful('고기', 'kjøtt', 'meat', '고기'),
  useful('어디', 'hvor', 'where', '어디'), useful('누구', 'hvem', 'who', '누구'),
  useful('나라', 'land', 'country', '나라'), useful('가족', 'familie', 'family', '가족'),
  useful('하루', 'én dag', 'one day', '하루'), useful('모자', 'hatt', 'hat', '모자'),
  ruleWord('책', '책', 'bok', 'book', '책', 'finalK', false),
  ruleWord('눈', '눈', 'øye / snø', 'eye / snow', '눈', 'finalN', false),
  ruleWord('물', '물', 'vann', 'water', '물', 'finalL', false),
  ruleWord('밤', '밤', 'natt / kastanje', 'night / chestnut', '밤', 'finalM', false),
  ruleWord('방', '방', 'rom', 'room', '방', 'finalNg', false),
  ruleWord('밥', '밥', 'kokt ris / måltid', 'cooked rice / meal', '밥', 'finalP', false),
  ruleWord('옷', '옫', 'klær', 'clothes', '옷', 'finalT'),
  ruleWord('꽃', '꼳', 'blomst', 'flower', '꽃', 'finalT'),
  ruleWord('밖', '박', 'utenfor', 'outside', '밖', 'finalK'),
  ruleWord('앞', '압', 'foran', 'front', '앞', 'finalP'),
  ruleWord('부엌', '부억', 'kjøkken', 'kitchen', '부엌', 'finalK'),
  ruleWord('무릎', '무릅', 'kne', 'knee', '무릎', 'finalP'),
  ruleWord('한국', '한국', 'Korea', 'Korea', '한국', 'finalK', false),
  ruleWord('음악', '으막', 'musikk', 'music', '음악', 'liaison'),
  ruleWord('꽃이', '꼬치', 'blomst + subjektmarkør', 'flower + subject marker', '꽃 + 주격 조사', 'liaison'),
  ruleWord('국물', '궁물', 'kraft / suppevæske', 'broth', '국물', 'nasalK'),
  ruleWord('먹는', '멍는', 'som spiser (verbform)', 'eating (verb form)', '먹다의 관형형', 'nasalK'),
  ruleWord('막내', '망내', 'den yngste', 'youngest member', '막내', 'nasalK'),
  ruleWord('밥물', '밤물', 'vann til å koke ris', 'water for cooking rice', '밥물', 'nasalP'),
  ruleWord('있는', '인는', 'som finnes (verbform)', 'existing (verb form)', '있다의 관형형', 'nasalT'),
  ruleWord('신라', '실라', 'Silla, et historisk koreansk rike', 'Silla, a historical Korean kingdom', '신라', 'liquid'),
  ruleWord('설날', '설랄', 'koreansk nyttårsdag', 'Korean Lunar New Year', '설날', 'liquid'),
  ruleWord('학교', '학꾜', 'skole', 'school', '학교', 'tense'),
  ruleWord('입다', '입따', 'å ta på seg klær', 'to wear clothes', '입다', 'tense'),
  ruleWord('좋다', '조타', 'å være bra', 'to be good', '좋다', 'aspirated'),
  ruleWord('좋아요', '조아요', 'det er bra / jeg liker det', 'it is good / I like it', '좋다의 해요체', 'silentH'),
  ruleWord('같이', '가치', 'sammen', 'together', '같이', 'palatal'),
  ruleWord('굳이', '구지', 'absolutt / med hensikt', 'insistently / deliberately', '굳이', 'palatal'),
  ruleWord('읽다', '익따', 'å lese', 'to read', '읽다', 'doubleK'),
  ruleWord('없다', '업따', 'å ikke finnes / ikke ha', 'to not exist / not have', '없다', 'doubleP'),
  ruleWord('앉다', '안따', 'å sette seg', 'to sit down', '앉다', 'doubleN'),
  ruleWord('여덟', '여덜', 'åtte', 'eight', '여덟', 'doubleL'),
  ruleWord('꽃잎', '꼰닙', 'kronblad', 'petal', '꽃잎', 'addedN'),
  ruleWord('독립', '동닙', 'uavhengighet', 'independence', '독립', 'nasalLiquid'),
];

// Pronunciation-oriented reading aid, deliberately distinct from official RR:
// tense consonants are visible (학교 -> hak-kkyo), and linked ㄹㄹ becomes l-l.
export function wordReadingAid(pronunciation: string): string {
  return pronunciation.split(' ').map(part => [...part].map((glyph, index, syllables) => {
    const code = glyph.codePointAt(0)! - 0xac00;
    const l = Math.floor(code / 588), v = Math.floor(code % 588 / 28), f = code % 28;
    if (code < 0 || code >= 11172) return glyph;
    let roman = spellSyllable(INITIALS[l], MEDIALS[v], FINALS[f]);
    const previous = index ? syllables[index - 1].codePointAt(0)! - 0xac00 : -1;
    if (INITIALS[l] === 'ㄹ' && previous >= 0 && previous % 28 === 8) roman = 'l' + roman.slice(1);
    return roman;
  }).join('-')).join(' ');
}

export function wordPool(mode: WordMode): WordEntry[] {
  return mode === 'mix' ? [...words] : words.filter(entry => entry.categories.includes(mode));
}

// Round-robin sampling gives each of the five categories a turn. Entries shared
// by batchim and sound changes are used only once; the final deck is shuffled.
export function makeWordDeck(mode: WordMode, count: number): WordEntry[] {
  const pool = wordPool(mode);
  const limit = count === 0 ? pool.length : Math.min(Math.max(0, Math.floor(count)), pool.length);
  if (mode === 'batchim' || mode === 'changes') {
    const rules = shuffle([...new Set(pool.map(entry => entry.rule))]);
    const buckets = rules.map(rule => shuffle(pool.filter(entry => entry.rule === rule)));
    const selected: WordEntry[] = [];
    while (selected.length < limit) {
      for (const bucket of buckets) {
        const entry = bucket.pop();
        if (entry) selected.push(entry);
        if (selected.length === limit) break;
      }
    }
    return shuffle(selected);
  }
  if (mode !== 'mix') return shuffle(pool).slice(0, limit);
  const buckets = wordCategories.map(category => shuffle(pool.filter(entry => entry.categories.includes(category))));
  const selected: WordEntry[] = [];
  const seen = new Set<string>();
  while (selected.length < limit) {
    const before = selected.length;
    for (const bucket of buckets) {
      while (bucket.length && seen.has(bucket[bucket.length - 1].id)) bucket.pop();
      const entry = bucket.pop();
      if (entry) { selected.push(entry); seen.add(entry.id); }
      if (selected.length === limit) break;
    }
    if (before === selected.length) break;
  }
  return shuffle(selected);
}
