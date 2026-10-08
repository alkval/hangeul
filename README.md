# Hangeul · 한글

A Korean alphabet trainer for [hangeul.alkval.com](https://hangeul.alkval.com). Norwegian is the default language; English and Korean are also available.

Inspired by the learning flow of [Kana-trening](https://kana.ckolle.no/). This is an original design and implementation.

## Features

- Configurable typing and multiple-choice quizzes in both directions.
- 40 letters, 40 introductory syllables and 20 syllables with final consonants.
- Flashcards with shuffling, mastery marking and a review filter.
- Searchable alphabet reference and Unicode syllable builder.
- Per-browser progress, accuracy, streaks and difficult characters.
- Timed exams: all characters in the selected syllabus, one attempt each, five seconds per question; one mistake or timeout ends the exam.
- Exam opens **12 October 2026 at 08:00 Europe/Oslo**, equivalent to **06:00 UTC**. All other learning modes remain available before then.
- Pronunciation samples and Korean browser speech synthesis for arbitrary syllables.

## Development

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

Tests cover the exam release boundary, all 11,172 Unicode syllable combinations, answer normalization, unambiguous multiple-choice options, mastery and invalid stored data.

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

Romanization follows the [National Institute of Korean Language](https://www.korean.go.kr/front_eng/roman/roman_01.do). Isolated ㄱ, ㄷ, ㅂ and ㄹ accept both positional variants. Initial ㅇ is silent and final ㅇ is `ng`. The reference makes these differences explicit; pronunciation samples use actual syllables rather than attempting to vocalize an isolated consonant. The syllable builder shows isolated-syllable readings, not a complete Korean word pronunciation engine. Sound changes across syllables are outside this app's scope.

## Frontend limitations

There is no backend, account system or verified leaderboard. Progress belongs to the current browser and can be lost when browser data is cleared. The date lock uses the device clock and can be bypassed by changing the clock or frontend code. Exam restrictions are practice rules, not security guarantees. Questions are shuffled with browser cryptographic randomness; duplicate submissions are ignored.

Arbitrary syllable pronunciation depends on an installed Korean browser voice. The app reports when speech is unavailable.

## License

MIT. See `LICENSE`.
