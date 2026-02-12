# Realtime Translator Demo

Realtime microphone transcription and translation demo built with Astro, React, ElevenLabs Scribe v2 realtime, and Chrome's built-in AI translator.

## Browser Support

This project is **Chrome-only**.

It relies on Chrome's `Translator` API for translation, so use the app in Google Chrome (latest stable). Other browsers are not supported for the full experience.

## What Is Implemented

- Realtime microphone transcription using ElevenLabs `scribe_v2_realtime`
- Single-use token generation on the server via `/api/scribe-token`
- Live partial transcript preview
- Committed transcript list with timestamps
- In-browser translation for live and committed text
- Input/target language selectors (Lithuanian, English, Spanish, French, German, Italian, Portuguese, Polish, Dutch, Swedish)

## Stack

- Astro 5
- React (`@astrojs/react`)
- Tailwind CSS 4 (`@tailwindcss/vite`)
- ElevenLabs SDKs (`@elevenlabs/react`, `@elevenlabs/elevenlabs-js`)

## Requirements

- Node.js 20+
- npm
- Google Chrome
- ElevenLabs API key

## Setup

1. Install dependencies:

```sh
npm install
```

2. Create/update `.env` with:

```env
ELEVENLABS_API_KEY=your_api_key_here
```

3. Start the dev server:

```sh
npm run dev
```

4. Open `http://localhost:4321` in **Chrome** and allow microphone access.

## Scripts

| Command | Purpose |
| :------ | :------ |
| `npm run dev` | Start local development server |
| `npm run build` | Build production output to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run astro -- --help` | Show Astro CLI help |

## Key Files

- `src/components/ScribeRealtimeDemo.tsx` - Realtime transcription/translation UI and logic
- `src/pages/api/scribe-token.ts` - Server route that issues single-use `realtime_scribe` tokens
- `src/pages/index.astro` - Main page shell and demo mount point
- `src/layouts/Layout.astro` - Shared layout and external style includes

## Notes

- `Layout.astro` links external Eleven CDN stylesheets for visual parity.
- The token endpoint is intended for local/demo use; add auth/rate limiting before production use.
