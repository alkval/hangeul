import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Layers3, LockKeyhole, RotateCcw, Shuffle, Sparkles, Target, Volume2, VolumeX, X, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { entries, groups, compose, spellSyllable, INITIALS, MEDIALS, FINALS, type Entry, type Group } from './data';
import { examIsOpen, EXAM_OPENS, poolFor, shuffle, optionsFor, correctAnswer, freshProgress, parseProgress, recordAnswer, type Direction } from './engine';
import { translate, type CopyKey, type Language } from './copy';

type Tab = 'quiz' | 'exam' | 'cards' | 'overview' | 'stats';
type Question = { entry: Entry; options: Entry[] };
type Answer = { entry: Entry; answer: string; correct: boolean; timedOut: boolean };
type Run = { id: string; questions: Question[]; index: number; answers: Answer[]; feedback: Answer | null; exam: boolean; direction: Direction; mode: 'typing'|'choice'; deadline: number; finished: boolean };
const PROGRESS_KEY = 'hangeul-progress-v1', SETTINGS_KEY = 'hangeul-settings-v1';
function readSettings(): {lang: Language; sound: boolean} {
  try { const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'); return {lang:['nb','en','ko'].includes(s?.lang)?s.lang:'nb',sound:s?.sound!==false}; }
  catch { return {lang:'nb',sound:true}; }
}
const tabIcons = {quiz:Target,exam:GraduationCap,cards:Layers3,overview:BookOpen,stats:ChartNoAxesColumnIncreasing};
const groupExample: Record<Group,string> = {consonants:'ㄱ ㄴ ㄷ',vowels:'ㅏ ㅓ ㅗ',tense:'ㄲ ㄸ ㅃ',extra:'ㅐ ㅘ ㅢ',syllables:'가 나 다',finals:'한 국 밥'};
const letterGroups: Group[] = ['consonants','vowels','tense','extra'];

export default function App() {
  const [settings,setSettings] = useState(readSettings);
  const [tab,setTab] = useState<Tab>('quiz');
  const [selected,setSelected] = useState<Group[]>(['consonants','vowels']);
  const [mode,setMode] = useState<'typing'|'choice'>('typing');
  const [direction,setDirection] = useState<Direction>('read');
  const [count,setCount] = useState(20);
  const [examGroups,setExamGroups] = useState<Group[]>(['consonants','vowels']);
  const [run,setRun] = useState<Run|null>(null);
  const [input,setInput] = useState('');
  const [now,setNow] = useState(Date.now());
  const [progress,setProgress] = useState(()=>{try{return parseProgress(localStorage.getItem(PROGRESS_KEY));}catch{return freshProgress();}});
  const [storageError,setStorageError] = useState(false);
  const [audioError,setAudioError] = useState(false);
  const [filter,setFilter] = useState<Group|'all'>('all');
  const [review,setReview] = useState(false);
  const [cardOrder,setCardOrder] = useState(()=>entries.map(e=>e.id));
  const [cardIndex,setCardIndex] = useState(0);
  const [flipped,setFlipped] = useState(false);
  const [search,setSearch] = useState('');
  const [detail,setDetail] = useState<Entry|null>(null);
  const [builder,setBuilder] = useState({l:'ㄱ',v:'ㅏ',t:''});
  const submission = useRef('');
  const answerInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playing = useRef<HTMLAudioElement|null>(null);
  const t=(key: CopyKey)=>translate(settings.lang,key);
  const pool=poolFor(selected);
  const letters=entries.filter(e=>letterGroups.includes(e.group));
  const mastery=letters.filter(e=>progress.items[e.id]?.mastered).length;
  const deck=cardOrder.map(id=>entries.find(e=>e.id===id)!).filter(e=>(filter==='all'||e.group===filter)&&(!review||((progress.items[e.id]?.attempts>0||progress.items[e.id]?.needsPractice)&&!progress.items[e.id]?.mastered)));
  const card=deck[cardIndex%Math.max(1,deck.length)];
  const active=run && !run.finished;
  const question=active ? run.questions[run.index] : null;
  const unlocked=examIsOpen(now);

  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),100); return ()=>clearInterval(id); },[]);
  useEffect(()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{setStorageError(true);}},[progress]);
  useEffect(()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{setStorageError(true);} document.documentElement.lang=settings.lang;
    document.title=`Hangeul · ${translate(settings.lang,'subtitle')}`;
  },[settings]);
  useEffect(()=>{if(active && !run.feedback)answerInput.current?.focus();},[run?.index,run?.id,run?.feedback]);
  useEffect(()=>{
    if (detail) { dialogRef.current?.showModal(); } else { dialogRef.current?.close(); }
  },[detail]);
  useEffect(()=>{
    const key=(event: KeyboardEvent)=>{
      if(tab!=='cards'||detail||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement)return;
      if(event.code==='Space'){event.preventDefault();setFlipped(f=>!f);}
      if(event.code==='ArrowRight')moveCard(1);
      if(event.code==='ArrowLeft')moveCard(-1);
    };
    window.addEventListener('keydown',key); return ()=>window.removeEventListener('keydown',key);
  },[tab,deck.length,detail]);
  useEffect(()=>{
    if(active && run.exam && !run.feedback && now>=run.deadline)submit('',true);
  },[now,run?.id,run?.index,run?.feedback,run?.finished]);
  useEffect(()=>()=>{playing.current?.pause();if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);

  function stopAudio() { playing.current?.pause(); playing.current=null; if('speechSynthesis' in window)window.speechSynthesis.cancel(); }
  function speak(text: string) {
    if(!settings.sound)return;
    setAudioError(false);stopAudio();
    const audio = new Audio(`/audio/${encodeURIComponent(text)}.mp3`); playing.current=audio;
    audio.play().catch(()=>{
      if(playing.current!==audio)return;
      if(!('speechSynthesis' in window)){setAudioError(true);return;}
      const voice=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ko'));
      if(!voice){setAudioError(true);return;}
      const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang='ko-KR';utterance.rate=.8;
      utterance.onerror=()=>setAudioError(true);window.speechSynthesis.speak(utterance);
    });
  }
  function start(exam=false, custom?: Entry[]) {
    if(exam && !examIsOpen())return;
    const source=custom||poolFor(exam?examGroups:selected);if(!source.length)return;
    const questions=shuffle(source).slice(0,exam||count===0||custom?source.length:count).map(entry=>({entry,options:optionsFor(entry,source,exam?'read':direction)}));
    submission.current='';stopAudio();setInput('');
    setRun({id:Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'),questions,index:0,answers:[],feedback:null,exam,direction:exam?'read':direction,mode:exam?'typing':mode,deadline:Date.now()+5000,finished:false});
  }
  function submit(answer: string, timedOut=false) {
    if(!run||run.finished||run.feedback)return;
    const key=`${run.id}:${run.index}`;if(submission.current===key)return;
    if(!timedOut&&!answer.trim())return;
    submission.current=key;
    timedOut=timedOut || (run.exam && Date.now()>=run.deadline);
    const entry=run.questions[run.index].entry;
    const correct=!timedOut && correctAnswer(entry,answer,run.direction);
    const response={entry,answer,correct,timedOut};
    setProgress(p=>recordAnswer(p,entry.id,correct));
    if(run.exam){
      const finished=!correct||run.index===run.questions.length-1;
      if(finished && correct)setProgress(p=>({...p,exams:p.exams+1}));
      setRun({...run,answers:[...run.answers,response],index:finished?run.index:run.index+1,deadline:Date.now()+5000,finished});setInput('');
    }else setRun({...run,answers:[...run.answers,response],feedback:response});
  }
  function next() {
    if(!run)return;
    setInput('');stopAudio();setRun({...run,index:run.index+1,feedback:null,finished:run.index+1>=run.questions.length});
  }
  function navigate(nextTab: Tab) {
    if(active && !confirm(t('cancelConfirm')))return;
    stopAudio();setRun(null);setInput('');setTab(nextTab);setDetail(null);
  }
  function moveCard(delta: number) {stopAudio();setCardIndex(i=>(i+delta+Math.max(1,deck.length))%Math.max(1,deck.length));setFlipped(false);}
  function markCard(mastered: boolean) {
    if(!card)return;
    setProgress(p=>({...p,items:{...p.items,[card.id]:{...(p.items[card.id]||{attempts:0,correct:0,streak:0}),mastered,needsPractice:!mastered}}}));
    if(!review)moveCard(1);else setFlipped(false);
  }
  const soundButton=(text: string,label=t('listen'),visible=false)=><button className={visible?'audio-action':'icon-button'} aria-label={label} disabled={!settings.sound} onClick={()=>speak(text)}><Volume2 size={20}/>{visible&&<span>{label}</span>}</button>;
  function entryAudio(entry: Entry,expanded=false) {
    const consonant=entry.group==='consonants'||entry.group==='tense';
    const label=t(consonant?'listenName':entry.group==='vowels'||entry.group==='extra'?'listenVowel':'listenSyllable');
    return <div className="entry-audio">
      {soundButton(entry.audio,label,true)}
      {expanded&&consonant&&<>
        <div className="audio-example"><span>{t('syllableExample')}: <strong>{entry.exampleAudio}</strong> ({entry.exampleRoman})</span>{soundButton(entry.exampleAudio!,t('listenExample'),true)}</div>
        <p className="muted">{t(entry.glyph==='ㅇ'?'ieungAudioNote':'audioGuide')}</p>
      </>}
    </div>;
  }
  function countdown() {
    const remaining=Math.max(0,Math.ceil((EXAM_OPENS-now)/1000));
    const units: [number,CopyKey][]=[[Math.floor(remaining/86400),'days'],[Math.floor(remaining/3600)%24,'hours'],[Math.floor(remaining/60)%60,'minutes'],[remaining%60,'seconds']];
    return <div className="countdown" aria-label={t('locked')}>{units.map(([value,key])=><div key={key}><strong>{String(value).padStart(2,'0')}</strong><span>{t(key)}</span></div>)}</div>;
  }

  return <div className="app-shell">
    <header className="header"><a className="brand" href="#" onClick={e=>{e.preventDefault();navigate('quiz');}}><span className="brand-mark">한</span><span><strong>Hangeul<span className="brand-dot">.</span></strong><small>{t('subtitle')}</small></span></a>
      <div className="header-tools"><label className="sr-only" htmlFor="language">{t('language')}</label><select id="language" value={settings.lang} onChange={e=>setSettings({...settings,lang:e.target.value as Language})}><option value="nb">Norsk</option><option value="en">English</option><option value="ko">한국어</option></select><button className="sound-toggle" aria-pressed={settings.sound} onClick={()=>{stopAudio();setSettings({...settings,sound:!settings.sound});}}>{settings.sound?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>{t(settings.sound?'sound':'mute')}</span></button></div>
    </header>
    <nav className="navigation" aria-label="Hangeul">{(['quiz','exam','cards','overview','stats'] as Tab[]).map(key=>{const Icon=tabIcons[key];return <button key={key} aria-current={tab===key?'page':undefined} onClick={()=>navigate(key)} className={tab===key?'active':''}><Icon size={19}/><span>{t(key)}</span>{key==='exam'&&!unlocked&&<LockKeyhole size={13} className="nav-lock"/>}</button>;})}</nav>
    {storageError&&<p className="notice" role="status">{t('storageError')}</p>}
    {audioError&&<p className="notice" role="status">{t('audioMissing')}<button onClick={()=>setAudioError(false)} aria-label={t('close')}><X size={16}/></button></p>}
    <main>
    {active && question ? <section className="session panel">
      <div className="session-top"><button className="text-button" onClick={()=>{if(confirm(t('cancelConfirm'))){setRun(null);stopAudio();}}}><ArrowLeft size={17}/>{t('cancel')}</button><span>{t('question')} {run.index+1} / {run.questions.length}</span></div>
      <div className="progress-track"><span style={{width:`${run.index/run.questions.length*100}%`}}/></div>
      <div className="question-meta"><span className="eyebrow">{t(question.entry.group)}</span>{run.exam?<span className="timer"><Clock3 size={18}/>{Math.max(0,(run.deadline-now)/1000).toFixed(1)} s</span>:<span>{t('score')}: {run.answers.filter(a=>a.correct).length}</span>}</div>
      <div className={`question-glyph ${run.direction==='write'?'roman-glyph':''}`}>{run.direction==='read'?question.entry.glyph:question.entry.roman}</div>
      <p className="question-help">{t(run.direction==='read'?'romanPrompt':'glyphPrompt')}</p>
      {run.mode==='typing'?<form onSubmit={e=>{e.preventDefault();if(run.feedback)next();else submit(input);}}>
        <label className="sr-only" htmlFor="answer">{t('answer')}</label><input className="answer-input" id="answer" ref={answerInput} value={input} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} readOnly={!!run.feedback} onChange={e=>setInput(e.target.value)} placeholder={t('answer')} maxLength={60}/>
        <button className="primary" disabled={!run.feedback&&!input.trim()} type="submit">{t(run.feedback?'next':'check')}</button>
        {!run.exam&&run.direction==='write'&&<p className="muted">{t('koreanKeyboard')}</p>}
      </form>:<div className="answers">{question.options.map(option=><button key={option.id} disabled={!!run.feedback} onClick={()=>submit(run.direction==='read'?option.roman:option.glyph)} className={run.feedback && correctAnswer(question.entry,run.direction==='read'?option.roman:option.glyph,run.direction)?'answer-correct':''}>{run.direction==='read'?option.roman:option.glyph}</button>)}</div>}
      {run.feedback&&<div className={`feedback ${run.feedback.correct?'success':'error'}`} role="status"><div>{run.feedback.correct?<Check size={21}/>:<X size={21}/>}<strong>{t(run.feedback.correct?'correct':'wrong')}</strong><span>{t('solution')}: {run.direction==='read'?question.entry.roman:question.entry.glyph}</span>{entryAudio(question.entry)}</div>{run.mode==='choice'&&<button className="primary" onClick={next}>{t('next')}</button>}</div>}
    </section> : run?.finished ? <section className="results panel"><div className={`result-icon ${run.exam&&!run.answers.every(a=>a.correct)?'fail':''}`}>{run.exam?<GraduationCap size={32}/>:<Sparkles size={32}/>}</div><p className="eyebrow">{t('finished')}</p><h1>{t(run.exam?(run.answers.every(a=>a.correct)?'passed':'failed'):'results')}</h1>
      <div className="result-stats"><div><strong>{run.answers.filter(a=>a.correct).length}/{run.questions.length}</strong><span>{t('score')}</span></div><div><strong>{Math.round(run.answers.filter(a=>a.correct).length/Math.max(1,run.answers.length)*100)}%</strong><span>{t('accuracy')}</span></div><div><strong>{run.answers.length}</strong><span>{t('attempted')}</span></div></div>
      {run.answers.some(a=>!a.correct)&&<div className="mistakes">{run.answers.filter(a=>!a.correct).map(a=><div key={a.entry.id}><span className="small-glyph">{a.entry.glyph}</span><span>{a.entry.roman}</span><small>{a.timedOut?t('timeout'):(a.answer||'—')}</small>{entryAudio(a.entry)}</div>)}</div>}
      <div className="result-actions">{run.answers.some(a=>!a.correct)&&<button className="primary" onClick={()=>start(false,run.answers.filter(a=>!a.correct).map(a=>a.entry))}>{t('retry')}</button>}<button className="secondary" onClick={()=>setRun(null)}>{t('home')}</button></div>
    </section> : <>
    {tab==='quiz'&&<>
      <div className="page-heading"><div><p className="eyebrow">{t('practice')}</p><h1>{t('title')}</h1><p>{t('intro')}</p></div><div className="heading-stamp" aria-hidden="true">가</div></div>
      <div className="practice-layout"><section className="panel setup"><div className="section-heading"><h2><span className="step">01</span>{t('groups')}</h2><div className="inline-links"><button onClick={()=>setSelected([...groups])}>{t('all')}</button><button onClick={()=>setSelected(['consonants','vowels'])}>{t('basic')}</button><button onClick={()=>setSelected([])}>{t('clear')}</button></div></div>
        <div className="group-grid">{groups.map(group=><label className={`group-card ${selected.includes(group)?'selected':''}`} key={group}><input type="checkbox" checked={selected.includes(group)} onChange={()=>setSelected(old=>old.includes(group)?old.filter(g=>g!==group):[...old,group])}/><span><strong>{t(group)}</strong><span className="group-example">{groupExample[group]}</span></span><small>{entries.filter(e=>e.group===group).length}</small></label>)}</div><p className="pool-count"><strong>{pool.length}</strong> {t('chosen')}</p>
        <fieldset><legend><span className="step">02</span>{t('mode')}</legend><div className="segmented"><button aria-pressed={mode==='typing'} className={mode==='typing'?'selected':''} onClick={()=>setMode('typing')}>{t('typing')}</button><button aria-pressed={mode==='choice'} className={mode==='choice'?'selected':''} onClick={()=>setMode('choice')}>{t('choice')}</button></div></fieldset>
        <fieldset><legend><span className="step">03</span>{t('direction')}</legend><div className="segmented"><button aria-pressed={direction==='read'} className={direction==='read'?'selected':''} onClick={()=>setDirection('read')}>{t('read')}</button><button aria-pressed={direction==='write'} className={direction==='write'?'selected':''} onClick={()=>setDirection('write')}>{t('write')}</button></div></fieldset>
        <fieldset><legend><span className="step">04</span>{t('count')}</legend><div className="segmented">{[10,20,50,0].map(n=><button aria-pressed={count===n} key={n} className={count===n?'selected':''} onClick={()=>setCount(n)}>{n||t('all')}</button>)}</div></fieldset>
        <button className="primary start-button" disabled={!pool.length} onClick={()=>start()}><Target size={20}/>{t('start')}<span>{count===0?pool.length:Math.min(count,pool.length)}</span></button>
      </section><aside className="practice-aside"><section className="blue-card"><p className="eyebrow">한글</p><div className="letter-equation" aria-hidden="true">ㄱ <span>+</span> ㅏ <span>=</span> 가</div><h2>{t('tipTitle')}</h2><p>{t('tip')}</p><button className="light-button" onClick={()=>navigate('overview')}>{t('tryBuilder')}</button></section>
        <section className="aside-exam"><div className="aside-icon"><GraduationCap size={22}/></div><h3>{t(unlocked?'examTitle':'locked')}</h3><p>{t('unlockDate')}</p><button className="text-button" onClick={()=>navigate('exam')}>{t('exam')} {!unlocked&&<LockKeyhole size={15}/>}</button></section>
        <div className="aside-progress"><span>{t('mastery')}</span><strong>{mastery} <small>/ 40</small></strong><div className="progress-track"><span style={{width:`${mastery/40*100}%`}}/></div></div>
      </aside></div>
    </>}
    {tab==='exam'&&<><div className="page-heading"><div><p className="eyebrow">{t('exam')}</p><h1>{t('examTitle')}</h1><p>{t('examIntro')}</p></div></div><section className="panel exam-panel">
      {!unlocked&&<div className="exam-lock"><LockKeyhole size={28}/><h2>{t('locked')}</h2><p>{t('unlockDate')}</p>{countdown()}</div>}
      <p className="exam-rule"><Clock3 size={19}/>{t('examRule')}</p><fieldset><legend>{t('syllabus')}</legend><div className="syllabus-options">{[{label:'basic',value:['consonants','vowels']},{label:'letters',value:letterGroups},{label:'full',value:groups}].map(({label,value})=><button key={label} aria-pressed={examGroups.length===value.length} onClick={()=>setExamGroups(value as Group[])} className={examGroups.length===value.length?'selected':''}><span>{t(label as CopyKey)}</span><strong>{poolFor(value as Group[]).length}</strong></button>)}</div></fieldset><button className="primary" disabled={!unlocked} onClick={()=>start(true)}>{!unlocked?<LockKeyhole size={19}/>:<GraduationCap size={20}/>} {t('examStart')}</button>
    </section></>}
    {tab==='cards'&&<><div className="page-heading"><div><p className="eyebrow">{t('cards')}</p><h1>{t('cardTitle')}</h1><p>{t('cardIntro')}</p></div></div><div className="card-controls"><label>{t('filter')}<select value={filter} onChange={e=>{setFilter(e.target.value as Group|'all');setCardIndex(0);setFlipped(false);}}><option value="all">{t('all')}</option>{groups.map(g=><option key={g} value={g}>{t(g)}</option>)}</select></label><button className="secondary" onClick={()=>{setCardOrder(shuffle(entries.map(e=>e.id)));setCardIndex(0);setFlipped(false);}}><Shuffle size={17}/>{t('shuffle')}</button><label className="review-check"><input type="checkbox" checked={review} onChange={e=>{setReview(e.target.checked);setCardIndex(0);setFlipped(false);}}/>{t('reviewOnly')}</label></div>
      {card?<section className="flash-section"><button className={`flash-card ${flipped?'flipped':''}`} onClick={()=>setFlipped(f=>!f)} aria-label={`${t('flip')}: ${flipped?card.roman:card.glyph}`}><span className="eyebrow">{t(card.group)}</span><span className={flipped?'flash-roman':'flash-glyph'}>{flipped?card.roman:card.glyph}</span>{flipped&&<span className="flash-name">{card.name}</span>}<span className="flip-hint">{t('flip')}</span></button>{entryAudio(card,true)}<div className="flash-nav"><button className="secondary" onClick={()=>moveCard(-1)}><ChevronLeft size={18}/>{t('previous')}</button><span>{cardIndex%deck.length+1} / {deck.length}</span><button className="secondary" onClick={()=>moveCard(1)}>{t('next')}<ChevronRight size={18}/></button></div><div className="flash-mark"><button className="secondary" onClick={()=>markCard(false)}><RotateCcw size={18}/>{t('needsPractice')}</button><button className="primary" onClick={()=>markCard(true)}><Check size={19}/>{t('mastered')}</button></div></section>:<p className="panel empty-state">{t('emptyReview')}</p>}
    </>}
    {tab==='overview'&&<><div className="page-heading"><div><p className="eyebrow">{t('overview')}</p><h1>{t('referenceTitle')}</h1><p>{t('referenceIntro')}</p></div></div><section className="builder panel"><div className="builder-fields"><h2>{t('builder')}</h2><div className="builder-selects"><label>{t('onset')}<select value={builder.l} onChange={e=>setBuilder({...builder,l:e.target.value})}>{INITIALS.map(g=><option key={g}>{g}</option>)}</select></label><label>{t('medial')}<select value={builder.v} onChange={e=>setBuilder({...builder,v:e.target.value})}>{MEDIALS.map(g=><option key={g}>{g}</option>)}</select></label><label>{t('final')}<select value={builder.t} onChange={e=>setBuilder({...builder,t:e.target.value})}>{FINALS.map(g=><option key={g} value={g}>{g||t('none')}</option>)}</select></label></div><p className="muted">{t('syllableNote')}</p></div><div className="builder-result"><strong>{compose(builder.l,builder.v,builder.t)}</strong><span>{spellSyllable(builder.l,builder.v,builder.t)}</span>{soundButton(compose(builder.l,builder.v,builder.t),t('listenSyllable'))}</div></section>
      <label className="sr-only" htmlFor="search">{t('search')}</label><input id="search" className="search" placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/>
      {groups.map(group=>{const list=entries.filter(e=>e.group===group&&`${e.glyph} ${e.roman} ${e.name}`.toLowerCase().includes(search.trim().toLowerCase()));return list.length?<section className="reference-section" key={group}><h2>{t(group)} <span>{list.length}</span></h2><p className="muted">{group==='consonants'||group==='tense'?t('consonantNote'):group==='vowels'?t('vowelNote'):group==='extra'?t('extraNote'):group==='finals'?t('finalNote'):null}</p><div className="alphabet-grid">{list.map(e=><button key={e.id} onClick={()=>setDetail(e)}><strong>{e.glyph}</strong><span>{e.roman}</span>{progress.items[e.id]?.mastered&&<Check size={13} className="mastered-check"/>}</button>)}</div></section>:null;})}
      {!entries.some(e=>`${e.glyph} ${e.roman} ${e.name}`.toLowerCase().includes(search.trim().toLowerCase()))&&<p className="empty-state">{t('noResults')}</p>}
    </>}
    {tab==='stats'&&<><div className="page-heading"><div><p className="eyebrow">{t('stats')}</p><h1>{t('statsTitle')}</h1><p>{t('statsIntro')}</p></div></div><div className="stats-grid">{[{key:'answered',value:progress.answered},{key:'accuracy',value:`${Math.round(progress.correct/Math.max(1,progress.answered)*100)}%`},{key:'best',value:progress.best},{key:'mastery',value:mastery}].map(s=><section key={s.key} className="stat-tile"><strong>{s.value}</strong><span>{t(s.key as CopyKey)}</span></section>)}</div><section className="panel stats-panel"><div className="section-heading"><h2>{t('mastery')}</h2><strong>{mastery} / 40</strong></div><div className="progress-track big"><span style={{width:`${mastery/40*100}%`}}/></div><div className="mastery-dots">{letters.map(e=><button title={`${e.glyph}: ${e.roman}`} aria-label={`${e.glyph}: ${t(progress.items[e.id]?.mastered?'mastered':'needsPractice')}`} className={progress.items[e.id]?.mastered?'done':''} key={e.id} onClick={()=>setDetail(e)}>{e.glyph}</button>)}</div><h2>{t('hard')}</h2>{!progress.answered?<p className="empty-state">{t('noStats')}</p>:<div className="hard-list">{entries.filter(e=>(progress.items[e.id]?.attempts||0)>(progress.items[e.id]?.correct||0)).sort((a,b)=>{const x=progress.items[a.id],y=progress.items[b.id];return (y.attempts-y.correct)-(x.attempts-x.correct);}).slice(0,8).map(e=><button key={e.id} onClick={()=>setDetail(e)}><strong>{e.glyph}</strong><span>{e.roman}</span><small>{progress.items[e.id].correct}/{progress.items[e.id].attempts}</small></button>)}{!Object.values(progress.items).some(s=>s.attempts>s.correct)&&<p>{t('noMistakes')}</p>}</div>}<div className="stats-bottom"><span className="muted">{t('local')}</span><button className="danger-button" onClick={()=>{if(confirm(t('resetConfirm')))setProgress(freshProgress());}}>{t('reset')}</button></div></section></>}
    </>}
    </main>
    <footer><span>Hangeul<span className="brand-dot">.</span> <span className="footer-korean">한글</span></span><span>{t('local')}</span><a href="https://www.korean.go.kr/front_eng/roman/roman_01.do" target="_blank" rel="noreferrer">{t('source')}</a></footer>
    <dialog ref={dialogRef} className="detail-dialog" onCancel={()=>setDetail(null)} onClick={e=>{if(e.target===dialogRef.current)setDetail(null);}}>{detail&&<><button className="dialog-close icon-button" aria-label={t('close')} onClick={()=>setDetail(null)}><X size={21}/></button><p className="eyebrow">{t(detail.group)}</p><div className="detail-glyph">{detail.glyph}</div><dl><dt>{t('roman')}</dt><dd>{detail.roman}</dd><dt>{t('name')}</dt><dd>{detail.name}</dd></dl>{entryAudio(detail,true)}<p className="muted">{t(detail.group==='consonants'||detail.group==='tense'?'consonantNote':detail.group==='vowels'?'vowelNote':detail.group==='extra'?'extraNote':detail.group==='finals'?'finalNote':'syllableNote')}</p></>}</dialog>
  </div>;
}
