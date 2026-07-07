# Cast It — Frontend

Listener app for the [Cast It](../cast-it-podcast-builder) AI podcast platform. Episodes are generated in the backend from the user's interests; this frontend lists them, plays them, and collects listening activity. Built with React 19, TypeScript, Vite, and Tailwind CSS 4.

## Features

- **Episode feed** — ready-to-play episodes with cover art, date, duration, and expandable show notes; episodes still in production appear under "Being made for you" with their pipeline status
- **Player** — persistent bottom player with play/pause, seek, skip back 15s / forward 30s, and playback speed (1× / 1.25× / 1.5× / 2×)
- **Resume** — playback position is saved per episode and restored on the next play
- **Activity tracking** — play, pause, seek, 30-second progress heartbeats, completes, and show-note opens are queued in `localStorage` (`castit.activity.queue`) so the backend can use them for interest-based generation. Set `VITE_ACTIVITY_ENDPOINT` to POST batches (`{ "events": [...] }`) once an ingestion endpoint exists; until then events stay queued locally (capped at 500).
- **Responsive** — single-column layout that works from phones to desktop

## Getting Started

Requires the Cast It backend running (default `http://localhost:8000`).

```bash
npm install
npm run dev
```

If the backend runs on a different port:

```bash
CAST_IT_API_URL=http://localhost:32768 npm run dev
```

API and media requests are proxied through the Vite dev server (`/api` and `/media`), so no CORS configuration is needed.

> Note: audio playback requires the backend to serve `/media/` files. The backend's dev settings do this via `static()` in `config/urls.py` when `DJANGO_DEBUG=true`.

## Build

```bash
npm run build    # output in dist/
npm run preview  # serve the production build locally
```
