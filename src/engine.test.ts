import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { audioUrl, recordings, availableAudioTexts, hasAudioClip } from './audio.ts';
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
test('ae uses the attributed recording in every audio context, without a stale cached TTS path',()=>{
  const ae=entries.find(e=>e.glyph==='ㅐ')!;
  assert.equal(ae.audio,'애');
  assert.equal(audioUrl(ae.audio),'/audio/ae-happymidnight-2019.mp3');
  assert.equal(audioUrl(compose('ㅇ','ㅐ')),audioUrl(ae.audio));
  assert.equal(recordings['애'].author,'HappyMidnight');
  assert.equal(recordings['애'].license,'https://creativecommons.org/licenses/by-sa/4.0/');
  const clip=readFileSync(new URL(`../public${audioUrl(ae.audio)}`,import.meta.url));
  assert.equal(createHash('sha256').update(clip).digest('hex'),'f6b430346c6d58a4c508ac963bfbd683c955dd9324e5d348d2f2390aefdd430a');
  assert.equal(audioUrl('가'),'/audio/%EA%B0%80.mp3');
});
test('all training sounds and 399 open syllables have actual clips; unsupported batchim has no playback button',()=>{
  for(const l of INITIALS)for(const v of MEDIALS)assert.equal(hasAudioClip(compose(l,v)),true);
  for(const text of ['게','갸','이응','앙','한'])assert.equal(hasAudioClip(text),true,text);
  assert.equal(hasAudioClip('갹'),false);
  for(const text of availableAudioTexts){
    const path=new URL(`../public${audioUrl(text)}`,import.meta.url);
    const clip=readFileSync(path);
    assert.ok(clip.length>1000,text);
    assert.ok(clip.subarray(0,3).toString()==='ID3'||(clip[0]===0xff&&(clip[1]&0xe0)===0xe0),text);
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
