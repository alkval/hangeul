import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { words } from '../src/words.ts';
import { wordAudioIds } from '../src/word-audio-manifest.ts';

assert.deepEqual([...wordAudioIds].sort(), words.map(entry => entry.id).sort(), 'Generate all 80 word audio clips before publishing');
for (const entry of words) {
  const clip = readFileSync(new URL(`../public/audio/words/${encodeURIComponent(entry.id)}.mp3`, import.meta.url));
  assert.ok(clip.length > 1000, entry.id);
  assert.ok(clip.subarray(0, 3).toString() === 'ID3' || (clip[0] === 0xff && (clip[1] & 0xe0) === 0xe0), `Invalid MP3: ${entry.id}`);
}
console.log(`Verified ${words.length} local MP3 clips, one for every word.`);
