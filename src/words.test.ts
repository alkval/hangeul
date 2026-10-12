import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWordDeck, wordCategories, wordModes, wordPool, wordReadingAid, wordRules, words } from './words.ts';
import { parseWordProgress } from './word-progress.ts';

test('80 unique real word prompts have localized meanings and valid pronunciation data', () => {
  assert.equal(words.length, 80);
  assert.equal(new Set(words.map(entry => entry.id)).size, words.length);
  for (const entry of words) {
    assert.equal(entry.id, entry.glyph);
    assert.match(entry.glyph, /^[가-힣 ]+$/);
    assert.match(entry.pronunciation, /^[가-힣 ]+$/);
    assert.equal(entry.meaning.length, 3);
    assert.ok(entry.meaning.every(text => text.length));
    assert.ok(entry.categories.length);
    assert.ok(entry.categories.every(category => wordCategories.includes(category)));
    if (entry.rule) assert.ok(wordRules[entry.rule]);
    assert.ok(new URL(entry.source).hostname.endsWith('korean.go.kr'));
  }
});
test('each dedicated mode exclusively draws its requested category', () => {
  for (const mode of wordModes.filter(mode => mode !== 'mix')) {
    const pool = wordPool(mode);
    assert.ok(pool.length >= 10, mode);
    assert.ok(pool.every(entry => entry.categories.includes(mode)));
    for (let attempt = 0; attempt < 20; attempt++) {
      const deck = makeWordDeck(mode, 10);
      assert.equal(deck.length, 10);
      assert.equal(new Set(deck.map(entry => entry.id)).size, 10);
      assert.ok(deck.every(entry => entry.categories.includes(mode)));
    }
  }
});
test('mixed rounds include useful words, names, loans, batchim and changes without repetition', () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const deck = makeWordDeck('mix', 10);
    assert.equal(deck.length, 10);
    assert.equal(new Set(deck.map(entry => entry.id)).size, 10);
    for (const category of wordCategories) assert.ok(deck.filter(entry => entry.categories.includes(category)).length >= 2, category);
  }
});
test('batchim and sound-change rounds introduce different rules before repeating one', () => {
  for (const mode of ['batchim', 'changes'] as const) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const deck = makeWordDeck(mode, 10);
      assert.equal(new Set(deck.map(entry => entry.rule)).size, 10);
    }
  }
});
test('all-word rounds preserve the full pool, small pools cap counts and no source list is mutated', () => {
  const before = words.map(entry => entry.id);
  for (const mode of wordModes) {
    for (const count of [0, 10, 20, 1000]) {
      const deck = makeWordDeck(mode, count);
      assert.equal(deck.length, count ? Math.min(count, wordPool(mode).length) : wordPool(mode).length);
      assert.equal(new Set(deck.map(entry => entry.id)).size, deck.length);
    }
  }
  assert.deepEqual(words.map(entry => entry.id), before);
});
test('sound-change mode excludes unchanged words and covers each taught transformation', () => {
  const changes = wordPool('changes');
  assert.ok(changes.every(entry => entry.glyph !== entry.pronunciation));
  for (const rule of Object.keys(wordRules)) assert.ok(words.some(entry => entry.rule === rule), rule);
  for (const [glyph, pronunciation] of [['학교', '학꾜'], ['같이', '가치'], ['국물', '궁물'], ['읽다', '익따'], ['꽃잎', '꼰닙'], ['독립', '동닙']]) {
    assert.equal(words.find(entry => entry.glyph === glyph)?.pronunciation, pronunciation);
  }
});
test('reading aids use spoken syllables, retain tense consonants and linked l-l', () => {
  assert.equal(wordReadingAid('학꾜'), 'hak-kkyo');
  assert.equal(wordReadingAid('궁물'), 'gung-mul');
  assert.equal(wordReadingAid('꼰닙'), 'kkon-nip');
  assert.equal(wordReadingAid('실라'), 'sil-la');
  assert.equal(wordReadingAid('해리 포터'), 'hae-ri po-teo');
});
test('word progress accepts only known words and bounded integer assessments', () => {
  const valid = { '학교': { attempts: 3, correct: 2, needsPractice: true } };
  assert.deepEqual(parseWordProgress(JSON.stringify(valid)), valid);
  for (const raw of [null, '{broken', 'null', '[]', '3']) assert.deepEqual(parseWordProgress(raw), {});
  assert.deepEqual(parseWordProgress(JSON.stringify({ ...valid, 'unknown': { attempts: 1, correct: 1, needsPractice: false } })), valid);
  for (const item of [{ attempts: -1, correct: 0, needsPractice: true }, { attempts: 1, correct: 2, needsPractice: false }, { attempts: 1.5, correct: 1, needsPractice: false }]) {
    assert.deepEqual(parseWordProgress(JSON.stringify({ '학교': item })), {});
  }
});
