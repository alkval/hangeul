import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Volume2, X } from 'lucide-react';
import type { Language } from './copy';
import { shuffle } from './engine';
import { localizedWordText, makeWordDeck, wordLabels, wordModes, wordPool, wordReadingAid, wordRules, type WordEntry, type WordMode } from './words';
import { wordAudioIds } from './word-audio-manifest';
import { parseWordProgress, type WordRecord } from './word-progress';

const copy = {
  title: ['Les ord', 'Read words', '단어 읽기'],
  mode: ['Ordutvalg', 'Word selection', '단어 선택'],
  count: ['Antall ord', 'Number of words', '단어 수'],
  all: ['Alle', 'All', '전체'],
  start: ['Start ordquiz', 'Start word quiz', '단어 퀴즈 시작'],
  instruction: ['Les ordet høyt. Vis uttalen når du har forsøkt.', 'Read the word aloud. Reveal its pronunciation after trying.', '단어를 소리 내어 읽은 다음 발음을 확인하세요.'],
  reveal: ['Vis uttale', 'Reveal pronunciation', '발음 확인'],
  pronunciation: ['Uttale', 'Pronunciation', '발음'],
  readingAid: ['Lesehjelp', 'Reading aid', '로마자 읽기 도움'],
  listen: ['Hør ordet', 'Listen to the word', '단어 듣기'],
  correct: ['Leste riktig', 'Read correctly', '잘 읽었어요'],
  practice: ['Øv mer', 'Practise more', '더 연습해요'],
  cancel: ['Avslutt økten', 'End session', '학습 종료'],
  question: ['Ord', 'Word', '단어'],
  score: ['Lest riktig', 'Read correctly', '잘 읽은 단어'],
  results: ['Ordquiz ferdig', 'Word quiz complete', '단어 퀴즈 완료'],
  assessment: ['Resultatet er basert på egen vurdering.', 'The result is based on self-assessment.', '결과는 자기 평가를 기준으로 합니다.'],
  retry: ['Øv på disse igjen', 'Practise these again', '다시 연습하기'],
  home: ['Tilbake til oppsett', 'Back to setup', '설정으로 돌아가기'],
  source: ['Uttalekilde', 'Pronunciation reference', '발음 참고 자료'],
  namesNote: ['Navn leses med koreansk uttale. Den kjente skrivemåten vises etterpå.', 'Names are read with Korean pronunciation. Their familiar spelling is revealed afterwards.', '이름은 한국어식으로 읽습니다. 익숙한 표기는 발음 확인 후 표시됩니다.'],
  audioCredit: ['Lyd: SunHi, syntetisk koreansk stemme.', 'Audio: SunHi, a synthetic Korean voice.', '음성: 한국어 합성 음성 SunHi.'],
  aidNote: ['Lesehjelpen er omtrentlig, ikke IPA eller offisiell romanisering. Lytt til hele ordet; slutt-k, -t og -p får ingen ekstra vokal.', 'The reading aid is approximate, not IPA or official romanization. Listen to the whole word; final k, t and p have no extra vowel.', '로마자 읽기 도움은 대략적인 표시이며 IPA나 공식 로마자 표기가 아닙니다. 단어 전체를 듣고 받침 뒤에 모음을 붙이지 마세요.'],
  audioMissing: ['Lydklippet kunne ikke spilles av. Prøv igjen.', 'The audio could not be played. Try again.', '음성을 재생할 수 없습니다. 다시 시도하세요.'],
  audioPending: ['Lydklippet er ikke klargjort ennå.', 'The audio clip has not been prepared yet.', '아직 음성이 준비되지 않았습니다.'],
  progress: ['Din ordøving', 'Your word practice', '단어 연습 기록'],
  read: ['vurderte ord', 'words assessed', '평가한 단어'],
  review: ['Kun ord som må øves på', 'Only words needing practice', '복습할 단어만'],
  empty: ['Ingen ord å repetere i dette utvalget.', 'No words to review in this selection.', '이 종류에는 복습할 단어가 없습니다.'],
  local: ['Egenvurderingen lagres i denne nettleseren, separat fra alfabetquizen.', 'Self-assessments are saved in this browser, separately from the alphabet quiz.', '자기 평가는 이 브라우저에 저장되며 글자 퀴즈 기록과 별도로 관리됩니다.'],
  storage: ['Nettleseren tillater ikke lagring. Ordøving beholdes bare mens siden er åpen.', 'Browser storage is unavailable. Word practice lasts only while this page is open.', '저장소를 사용할 수 없습니다. 단어 연습 기록은 페이지를 닫으면 사라집니다.'],
  reset: ['Nullstill ordøving', 'Reset word practice', '단어 기록 초기화'],
  resetConfirm: ['Slette ordøving i denne nettleseren? Alfabetøving beholdes.', 'Delete word practice in this browser? Alphabet practice is kept.', '이 브라우저의 단어 기록을 삭제할까요? 글자 퀴즈 기록은 유지됩니다.'],
} satisfies Record<string, readonly [string, string, string]>;

type Rating = { entry: WordEntry; correct: boolean };
type WordRun = { deck: WordEntry[]; index: number; revealed: boolean; ratings: Rating[] };
const STORAGE_KEY = 'hangeul-word-progress-v1';

export default function WordQuiz({ lang, sound, onActiveChange }: { lang: Language; sound: boolean; onActiveChange: (active: boolean) => void }) {
  const t = (key: keyof typeof copy) => localizedWordText(copy[key], lang);
  const [mode, setMode] = useState<WordMode>('mix');
  const [count, setCount] = useState(10);
  const [review, setReview] = useState(false);
  const [run, setRun] = useState<WordRun | null>(null);
  const [records, setRecords] = useState<Record<string, WordRecord>>(() => {
    try { return parseWordProgress(localStorage.getItem(STORAGE_KEY)); } catch { return {}; }
  });
  const [storageError, setStorageError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const playing = useRef<HTMLAudioElement | null>(null);
  const ratedIndex = useRef(-1);
  const revealButton = useRef<HTMLButtonElement>(null);
  const ratingButton = useRef<HTMLButtonElement>(null);
  const active = !!run && run.index < run.deck.length;
  const entry = active ? run.deck[run.index] : null;
  const pool = wordPool(mode).filter(word => !review || records[word.id]?.needsPractice);
  const available = entry ? wordAudioIds.includes(entry.id) : false;

  useEffect(() => { onActiveChange(active); }, [active, onActiveChange]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { setStorageError(true); }
  }, [records]);
  useEffect(() => { if (!sound) stopAudio(); }, [sound]);
  useEffect(() => () => { playing.current?.pause(); }, []);
  useEffect(() => {
    if (active) (run.revealed ? ratingButton : revealButton).current?.focus();
  }, [run?.index, run?.revealed, active]);

  function stopAudio() { playing.current?.pause(); playing.current = null; setAudioError(false); }
  function play(word: WordEntry) {
    stopAudio();
    if (!sound || !wordAudioIds.includes(word.id)) return;
    const audio = new Audio(`/audio/words/${encodeURIComponent(word.id)}.mp3`);
    playing.current = audio;
    const failed = () => { if (playing.current === audio) setAudioError(true); };
    audio.onerror = failed;
    audio.play().catch(failed);
  }
  function start(custom?: WordEntry[]) {
    const deck = custom ? shuffle(custom) : review ? shuffle(pool).slice(0, count || pool.length) : makeWordDeck(mode, count);
    if (!deck.length) return;
    stopAudio(); ratedIndex.current = -1;
    setRun({ deck, index: 0, revealed: false, ratings: [] });
  }
  function rate(correct: boolean) {
    if (!run || !entry || !run.revealed || ratedIndex.current === run.index) return;
    ratedIndex.current = run.index;
    stopAudio();
    setRecords(previous => {
      const item = previous[entry.id] || { attempts: 0, correct: 0, needsPractice: false };
      return { ...previous, [entry.id]: { attempts: item.attempts + 1, correct: item.correct + Number(correct), needsPractice: !correct } };
    });
    setRun({ ...run, index: run.index + 1, revealed: false, ratings: [...run.ratings, { entry, correct }] });
  }
  const summary = Object.values(records).reduce((total, item) => ({ attempts: total.attempts + item.attempts, correct: total.correct + item.correct }), { attempts: 0, correct: 0 });

  return <div className="word-quiz">
    {storageError && <p className="notice" role="status">{t('storage')}</p>}
    {active && entry ? <section className="session panel word-session">
      <div className="session-top"><button className="text-button" onClick={() => { if (confirm(localizedWordText(['Avslutte ordøving?', 'End word practice?', '단어 연습을 종료할까요?'], lang))) { stopAudio(); setRun(null); } }}><ArrowLeft size={17}/>{t('cancel')}</button><span>{t('question')} {run.index + 1} / {run.deck.length}</span></div>
      <div className="progress-track"><span style={{ width: `${run.index / run.deck.length * 100}%` }}/></div>
      <div className="question-meta"><span className="eyebrow">{localizedWordText(wordLabels[mode], lang)}</span><span>{t('score')}: {run.ratings.filter(item => item.correct).length}</span></div>
      <div className="word-glyph" lang="ko">{entry.glyph}</div>
      {!run.revealed ? <><p className="question-help">{t('instruction')}</p><button ref={revealButton} className="primary word-reveal" onClick={() => setRun({ ...run, revealed: true })}>{t('reveal')}</button></> : <>
        <div className="word-answer" aria-live="polite">
          <div className="word-pronunciation"><span>{t('pronunciation')}</span><strong lang="ko">[{entry.pronunciation}]</strong></div>
          <p className="word-roman"><span>{t('readingAid')}: </span>{wordReadingAid(entry.pronunciation)}</p>
          <p className="word-meaning">{localizedWordText(entry.meaning, lang)}</p>
          <div className="word-audio"><button className="audio-action" disabled={!sound || !available} onClick={() => play(entry)}><Volume2 size={20}/>{t('listen')}</button>{!available && <small className="muted">{t('audioPending')}</small>}</div>
          {audioError && <p className="notice" role="status">{t('audioMissing')}</p>}
          {entry.rule && <p className="word-rule">{localizedWordText(wordRules[entry.rule], lang)}</p>}
          {entry.categories.includes('names') && <p className="muted">{t('namesNote')}</p>}
          {!entry.categories.includes('names') && <a className="word-source" href={entry.source} target="_blank" rel="noreferrer">{t('source')} ↗</a>}
        </div>
        <div className="flash-mark word-rating"><button className="secondary" onClick={() => rate(false)}><RotateCcw size={18}/>{t('practice')}</button><button ref={ratingButton} className="primary" onClick={() => rate(true)}><Check size={19}/>{t('correct')}</button></div>
      </>}
    </section> : run ? <section className="results panel word-results"><div className="result-icon"><Check size={32}/></div><h1>{t('results')}</h1><div className="result-stats"><div><strong>{run.ratings.filter(item => item.correct).length}/{run.deck.length}</strong><span>{t('score')}</span></div><div><strong>{run.ratings.filter(item => !item.correct).length}</strong><span>{t('practice')}</span></div></div><p className="muted">{t('assessment')}</p>
      {run.ratings.some(item => !item.correct) && <div className="word-review-list">{run.ratings.filter(item => !item.correct).map(({ entry: word }) => <div key={word.id}><strong lang="ko">{word.glyph}</strong><span lang="ko">[{word.pronunciation}]</span><button className="icon-button" disabled={!sound || !wordAudioIds.includes(word.id)} aria-label={`${t('listen')}: ${word.glyph}`} onClick={() => play(word)}><Volume2 size={19}/></button></div>)}</div>}
      {audioError && <p className="notice" role="status">{t('audioMissing')}</p>}
      <div className="result-actions">{run.ratings.some(item => !item.correct) && <button className="primary" onClick={() => start(run.ratings.filter(item => !item.correct).map(item => item.entry))}>{t('retry')}</button>}<button className="secondary" onClick={() => { stopAudio(); setRun(null); }}>{t('home')}</button></div>
    </section> : <><div className="page-heading quiz-heading"><h1>{t('title')}</h1></div><section className="panel setup word-setup">
      <fieldset><legend>{t('mode')}</legend><div className="word-modes">{wordModes.map(value => <button key={value} className={mode === value ? 'selected' : ''} aria-pressed={mode === value} onClick={() => setMode(value)}><span>{localizedWordText(wordLabels[value], lang)}</span><small>{wordPool(value).length}</small></button>)}</div></fieldset>
      <fieldset><legend>{t('count')}</legend><div className="segmented">{[10, 20, 0].map(value => <button key={value} className={count === value ? 'selected' : ''} aria-pressed={count === value} onClick={() => setCount(value)}>{value || t('all')}</button>)}</div></fieldset>
      <label className="word-review-check"><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)}/>{t('review')}</label>
      {review && !pool.length && <p className="muted">{t('empty')}</p>}
      <button className="primary start-button" disabled={!pool.length} onClick={() => start()}>{t('start')}<span>{count ? Math.min(count, pool.length) : pool.length}</span></button>
      <p className="muted word-setup-note">{t('instruction')}</p>
    </section>
    {!!summary.attempts && <section className="panel word-progress"><h2>{t('progress')}</h2><p><strong>{summary.attempts}</strong> {t('read')} · <strong>{summary.correct}</strong> {t('score').toLowerCase()}</p><button className="text-button" onClick={() => { if (confirm(t('resetConfirm'))) setRecords({}); }}><X size={15}/>{t('reset')}</button></section>}
    </>}
    <details className="word-notes"><summary>{t('readingAid')} &amp; {t('pronunciation').toLowerCase()}</summary><p>{t('aidNote')}</p><p>{t('audioCredit')}</p><p>{t('local')}</p></details>
  </div>;
}
