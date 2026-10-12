# Hangeul · 한글

A Korean alphabet trainer for [hangeul.alkval.com](https://hangeul.alkval.com). Norwegian is the default language; English and Korean are also available.

Inspired by the learning flow of [Kana-trening](https://kana.ckolle.no/). This is an original design and implementation.

## Features

- Configurable typing and multiple-choice quizzes in both directions. Multiple choice mixes related distractors with a more distinct one, preferring the same character group and excluding ambiguous answers.
- 40 letters, 40 introductory syllables and 20 syllables with final consonants.
- Flashcards with shuffling, mastery marking and a review filter.
- Searchable alphabet reference and Unicode syllable builder.
- Per-browser progress, accuracy, streaks and difficult characters.
- Timed exams: all characters in the selected syllabus, one attempt each, five seconds per question; one mistake or timeout ends the exam.
- Exam opens **12 October 2026 at 08:00 Europe/Oslo**, equivalent to **06:00 UTC**. All other learning modes remain available before then.
- Fixed MP3 clips for all training items and all 399 initial-consonant + vowel syllables. No browser speech synthesis.
- A separate oral word quiz: 80 words, a balanced mix, English loanwords, names, batchim rules and sound changes. Pronunciation, meaning and playback are revealed after reading aloud. Results are self-assessed, with a separate per-browser review list.

## Development

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
npm test
npm run verify:word-audio
npm run build
```

Tests cover the exam release boundary, all 11,172 Unicode syllable combinations, answer normalization, unambiguous multiple-choice options, mastery, invalid stored data and the presence of playable MP3 files for every supported sound.

Word tests also cover category isolation, balanced mixed rounds without duplicates, curated sound changes, pronunciation reading aids and validated separate word progress. `verify:word-audio` checks that every word has an actual local MP3 and appears in the playback manifest. Docker builds run this check before building the site.

### Preparing word audio

The word bank uses one consistent **ko-KR-SunHiNeural** synthetic Korean voice at -15% rate. This is not a recording of a human speaker. Full words are rendered together so liaison and assimilation are retained. Audio is generated in advance and served locally; visitors do not call a speech service.

```sh
python -m venv .audio-env
# Activate the virtual environment using the command for your shell.
python -m pip install edge-tts==7.2.8
python -X utf8 scripts/generate-word-audio.py
npm run verify:word-audio
```

Network access is needed for generation. The script writes `public/audio/words/*.mp3` and updates `src/word-audio-manifest.ts` only when all 80 clips exist. Listen to representative clips, especially sound-change words and names, before publishing; structural MP3 checks cannot assess pronunciation quality.

## Docker on the homelab

```sh
docker compose up -d --build
curl --fail http://127.0.0.1:3015/health
```

The container serves static assets on port 8080 and joins the existing `portfolio_default` Docker network. Its host port is bound only to loopback. Set `PUBLIC_TUNNEL_NETWORK` to use another existing tunnel network.

In the existing Cloudflare Tunnel, add a public hostname:

| Setting | Value |
| --- | --- |
| Hostname | `hangeul.alkval.com` |
| Service | `http://hangeul:8080` |

No router ports need to be opened. Tunnel credentials remain in the existing infrastructure; they are never included in this repository.

## Learning conventions

Alphabet romanization follows the [National Institute of Korean Language](https://www.korean.go.kr/front_eng/roman/roman_01.do). Isolated ㄱ, ㄷ, ㅂ and ㄹ accept both positional variants. Initial ㅇ is silent and final ㅇ is `ng`. The reference makes these differences explicit; consonant audio buttons play the Korean letter name, explicitly labelled as a name. Separate, labelled syllable examples demonstrate consonant sounds in context. For ㅇ, the example is 앙 (ang), where the final ㅇ has the ng sound; 아 only demonstrates silent initial ㅇ. Vowel buttons play the vowel sound and syllable buttons play the syllable. Most clips are synthetic Korean speech, not recordings of isolated consonant phonemes. The 애 (ae) and 게 (ge) clips use human recordings by HappyMidnight from Wikimedia Commons under CC BY-SA 4.0; attribution appears beside its playback button. See [audio credits](public/audio/CREDITS.md). The syllable builder shows isolated-syllable readings, not a complete Korean word pronunciation engine.

The word quiz has a curated full-word pronunciation field with beginner-friendly Hangul sound spellings and short original explanations, based on [Korean Basic Dictionary](https://krdict.korean.go.kr/eng/mainAction) and [standard pronunciation rules](https://www.korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0002). Reference links are shown after revealing each dictionary word. Names use Korean readings of the displayed spelling; alternative transliterations of foreign names exist. The hyphenated Latin **reading aid** is approximate, not IPA or official Revised Romanization: for instance, 학교 is displayed as [학꾜], `hak-kkyo`, explicitly preserving the tense consonant. Dictionary long-vowel marks are omitted in this beginner mode.

## Frontend limitations

There is no backend, account system or verified leaderboard. Progress belongs to the current browser and can be lost when browser data is cleared. The date lock uses the device clock and can be bypassed by changing the clock or frontend code. Exam restrictions are practice rules, not security guarantees. Questions are shuffled with browser cryptographic randomness; duplicate submissions are ignored.

The builder has fixed audio for all 399 syllables without a final consonant, plus the 20 curriculum examples with batchim and 앙. Other builder combinations display that their audio clip is unavailable. Playback never falls back to a browser voice. A clip loading or playback error names the failed sound and offers a retry.

## License

Application code: MIT. See `LICENSE`. Third-party audio retains its own license; see [audio credits](public/audio/CREDITS.md).
