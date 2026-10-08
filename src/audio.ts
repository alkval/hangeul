export const recordings: Record<string, {file: string; author: string; source: string; license: string}> = {
  '애': {
    file: 'ae-happymidnight-2019.mp3',
    author: 'HappyMidnight',
    source: 'https://commons.wikimedia.org/wiki/File:Ko-%EC%95%A0.ogg',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

// Select by Korean text so the reference, cards, quiz feedback and builder agree.
export function audioUrl(text: string): string {
  return `/audio/${recordings[text]?.file||`${encodeURIComponent(text)}.mp3`}`;
}
