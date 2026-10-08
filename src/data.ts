export type Group = 'consonants' | 'vowels' | 'tense' | 'extra' | 'syllables' | 'finals';
export interface Entry { id: string; glyph: string; roman: string; aliases: string[]; name: string; group: Group; audio: string; exampleAudio?: string; exampleRoman?: string; }
export const INITIALS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
export const MEDIALS = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
export const FINALS = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
export const initialRoman = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
export const vowelRoman = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
export const finalRoman = ['', 'k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
export function compose(initial: string, vowel: string, final = ''): string {
  const l = INITIALS.indexOf(initial), v = MEDIALS.indexOf(vowel), t = FINALS.indexOf(final);
  if (l < 0 || v < 0 || t < 0) throw new Error('Invalid syllable components');
  return String.fromCodePoint(0xAC00 + (l * 21 + v) * 28 + t);
}
export function spellSyllable(initial: string, vowel: string, final = ''): string {
  const onset = initialRoman[INITIALS.indexOf(initial)];
  return (initial === 'ㅅ' && vowel === 'ㅣ' ? 'si' : onset + vowelRoman[MEDIALS.indexOf(vowel)]) + finalRoman[FINALS.indexOf(final)];
}
const consonants: [string,string,string,string][] = [
  ['ㄱ','g / k','기역','가'], ['ㄴ','n','니은','나'], ['ㄷ','d / t','디귿','다'],
  ['ㄹ','r / l','리을','라'], ['ㅁ','m','미음','마'], ['ㅂ','b / p','비읍','바'],
  ['ㅅ','s','시옷','사'], ['ㅇ','silent / ng','이응','앙'], ['ㅈ','j','지읒','자'],
  ['ㅊ','ch','치읓','차'], ['ㅋ','k','키읔','카'], ['ㅌ','t','티읕','타'],
  ['ㅍ','p','피읖','파'], ['ㅎ','h','히읗','하'],
];
const tense: [string,string,string,string][] = [
  ['ㄲ','kk','쌍기역','까'], ['ㄸ','tt','쌍디귿','따'], ['ㅃ','pp','쌍비읍','빠'],
  ['ㅆ','ss','쌍시옷','싸'], ['ㅉ','jj','쌍지읒','짜'],
];
function consonantEntries(rows: typeof consonants, group: Group): Entry[] {
  return rows.map(([glyph,roman,name,exampleAudio]) => ({id:glyph,glyph,roman,name,audio:name,group,exampleAudio,
    exampleRoman:glyph==='ㅇ'?'ang':spellSyllable(glyph,'ㅏ'),
    aliases: glyph === 'ㅇ' ? ['silent','ng','stum','무음','silent/ng','ng/silent'] : [...roman.split(' / '),roman]}));
}
const basicVowels = [...'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'];
const extraVowels = [...'ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ'];
function vowelEntries(rows: string[], group: Group): Entry[] {
  return rows.map(glyph => { const roman = vowelRoman[MEDIALS.indexOf(glyph)]; const audio = compose('ㅇ',glyph);
    return {id:glyph,glyph,roman,aliases:[roman],name:audio,audio,group}; });
}
const syllableRows: [string,string,string?][] = [
  ['ㄱ','ㅏ'],['ㄴ','ㅏ'],['ㄷ','ㅏ'],['ㄹ','ㅏ'],['ㅁ','ㅏ'],['ㅂ','ㅏ'],['ㅅ','ㅏ'],['ㅇ','ㅏ'],['ㅈ','ㅏ'],['ㅊ','ㅏ'],['ㅋ','ㅏ'],['ㅌ','ㅏ'],['ㅍ','ㅏ'],['ㅎ','ㅏ'],
  ['ㄱ','ㅓ'],['ㄴ','ㅗ'],['ㄷ','ㅜ'],['ㄹ','ㅡ'],['ㅁ','ㅣ'],['ㅂ','ㅐ'],['ㅅ','ㅣ'],['ㅇ','ㅔ'],['ㅈ','ㅛ'],['ㅊ','ㅠ'],['ㅎ','ㅘ'],['ㅇ','ㅚ'],['ㅇ','ㅟ'],['ㅇ','ㅢ'],['ㄲ','ㅏ'],['ㄸ','ㅏ'],['ㅃ','ㅏ'],['ㅆ','ㅏ'],['ㅉ','ㅏ'],['ㄱ','ㅕ'],['ㅂ','ㅖ'],['ㅇ','ㅙ'],['ㅇ','ㅝ'],['ㅇ','ㅞ'],['ㅇ','ㅒ'],['ㅇ','ㅑ'],
];
const finalRows: [string,string,string][] = [
  ['ㅎ','ㅏ','ㄴ'],['ㄱ','ㅜ','ㄱ'],['ㅂ','ㅏ','ㅂ'],['ㄱ','ㅣ','ㅁ'],['ㅁ','ㅜ','ㄹ'],
  ['ㄱ','ㅏ','ㅇ'],['ㅇ','ㅗ','ㅅ'],['ㄲ','ㅗ','ㅊ'],['ㅂ','ㅏ','ㄲ'],['ㅂ','ㅣ','ㅊ'],
  ['ㄴ','ㅜ','ㄴ'],['ㄷ','ㅏ','ㄹ'],['ㅅ','ㅏ','ㄴ'],['ㅈ','ㅣ','ㅂ'],['ㅊ','ㅐ','ㄱ'],
  ['ㄱ','ㅗ','ㅇ'],['ㅅ','ㅗ','ㄴ'],['ㅁ','ㅓ','ㄱ'],['ㄷ','ㅓ','ㅅ'],['ㄲ','ㅡ','ㅌ'],
];
function syllableEntries(rows: [string,string,string?][], group: Group): Entry[] {
  return rows.map(([l,v,t='']) => { const glyph = compose(l,v,t), roman = spellSyllable(l,v,t);
    return {id:glyph,glyph,roman,aliases:[roman],name:`${l} + ${v}${t ? ` + ${t}` : ''}`,audio:glyph,group}; });
}
export const entries: Entry[] = [...consonantEntries(consonants,'consonants'),...vowelEntries(basicVowels,'vowels'),
  ...consonantEntries(tense,'tense'),...vowelEntries(extraVowels,'extra'),...syllableEntries(syllableRows,'syllables'),...syllableEntries(finalRows,'finals')];
export const groups: Group[] = ['consonants','vowels','tense','extra','syllables','finals'];
