import { entries, INITIALS, MEDIALS, compose } from './data.ts';

export const recordings: Record<string, {file: string; author: string; source: string; license: string}> = {
  '애': {
    file: 'ae-happymidnight-2019.mp3',
    author: 'HappyMidnight',
    source: 'https://commons.wikimedia.org/wiki/File:Ko-%EC%95%A0.ogg',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  '게': {
    file: 'ge-happymidnight-2017.mp3',
    author: 'HappyMidnight',
    source: 'https://commons.wikimedia.org/wiki/File:Ko-%EA%B2%8C.ogg',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

// Select by Korean text so the reference, cards, quiz feedback and builder agree.
export function audioUrl(text: string): string {
  return `/audio/${recordings[text]?.file||`${encodeURIComponent(text)}.mp3`}`;
}

export const availableAudioTexts = [...new Set([
  ...entries.flatMap(entry=>[entry.audio,...(entry.exampleAudio?[entry.exampleAudio]:[])]),
  ...INITIALS.flatMap(initial=>MEDIALS.map(vowel=>compose(initial,vowel))),
])];
const availableAudio = new Set(availableAudioTexts);
export const hasAudioClip = (text: string): boolean => availableAudio.has(text);
