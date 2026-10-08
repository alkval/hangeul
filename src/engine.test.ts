import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { entries, compose, spellSyllable, FINALS, INITIALS, MEDIALS } from './data.ts';
import { EXAM_OPENS, examIsOpen, correctAnswer, shuffle, optionsFor, recordAnswer, freshProgress, parseProgress } from './engine.ts';
test('Oslo release boundary is Monday 12 October at 08:00 (+02:00)',()=>{
  assert.equal(new Date(EXAM_OPENS).toISOString(),'2026-10-12T06:00:00.000Z');
  assert.equal(new Date(EXAM_OPENS).getUTCDay(),1);
  assert.equal(examIsOpen(EXAM_OPENS-1),false); assert.equal(examIsOpen(EXAM_OPENS),true);
});
test('Unicode syllables cover all 11172 combinations without collisions',()=>{
  const set = new Set<string>();
  for (const l of INITIALS) for (const v of MEDIALS) for (const t of FINALS) set.add(compose(l,v,t));
  assert.equal(set.size,11172); assert.equal(compose('ㅎ','ㅏ','ㄴ'),'한');
  assert.equal(spellSyllable('ㅇ','ㅏ'),'a'); assert.equal(spellSyllable('ㄲ','ㅗ','ㅊ'),'kkot');
  assert.throws(()=>compose('x','ㅏ'));
});
test('40 letters; unique question IDs; each correct answer is accepted',()=>{
  assert.equal(entries.filter(e=>!['syllables','finals'].includes(e.group)).length,40);
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  for (const e of entries) { assert.equal(correctAnswer(e,e.roman,'read'),true,e.id); assert.equal(correctAnswer(e,e.glyph,'write'),true,e.id); }
  assert.equal(correctAnswer(entries[0],' K ','read'),true);
  assert.equal(correctAnswer(entries[0],'n','read'),false);
});
test('consonant audio is a letter name; ieung demonstrates final ng instead of silent initial ieung',()=>{
  const consonants=entries.filter(e=>e.group==='consonants'||e.group==='tense');
  assert.equal(consonants.length,19);
  for(const e of consonants){
    assert.equal(e.audio,e.name,e.id);
    assert.notEqual(e.audio,e.exampleAudio,e.id);
    assert.ok(e.exampleAudio&&e.exampleRoman,e.id);
  }
  const ieung=entries.find(e=>e.glyph==='ㅇ')!;
  assert.equal(ieung.audio,'이응');
  assert.equal(ieung.exampleAudio,compose('ㅇ','ㅏ','ㅇ'));
  assert.equal(ieung.exampleRoman,'ang');
  for(const e of entries){
    for(const text of [e.audio,e.exampleAudio].filter((value): value is string=>!!value)){
      assert.ok(statSync(new URL(`../public/audio/${text}.mp3`,import.meta.url)).size>1000,text);
    }
  }
});
test('shuffling preserves input and multiple choice never exposes another accepted answer',()=>{
  assert.deepEqual(shuffle([1,2,3]).sort(),[1,2,3]);
  for (const e of entries) {
    const options=optionsFor(e,entries,'read');
    assert.equal(options.filter(o=>correctAnswer(e,o.roman,'read')).length,1,e.id);
    assert.equal(new Set(options.map(o=>o.id)).size,options.length);
  }
});
test('mastery requires three consecutive correct answers and mistakes reset it',()=>{
  let p=freshProgress(); for(let i=0;i<3;i++)p=recordAnswer(p,'ㄱ',true);
  assert.equal(p.items['ㄱ'].mastered,true); p=recordAnswer(p,'ㄱ',false);
  assert.equal(p.items['ㄱ'].mastered,false); assert.equal(p.best,3); assert.equal(p.answered,4);
  assert.deepEqual(parseProgress(JSON.stringify(p)),p);
  assert.deepEqual(parseProgress('{broken'),freshProgress());
  assert.deepEqual(parseProgress(JSON.stringify({...p,answered:-1})),freshProgress());
});
