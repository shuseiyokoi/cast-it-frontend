# Cast It — Frontend

Listener app for the ([Cast It](https://shuseiyokoi.github.io/cast-it-frontend/)) AI podcast platform. Episodes are generated locally by the backend and published to Supabase; this frontend lists them, plays them, collects listening activity, and personalizes the feed per listener. Built with React 19, TypeScript, Vite, Tailwind CSS 4, and Supabase (data + auth).

## Features

- **Personalized episode feed** — episodes ranked by how much you listen to each tag (LLM, Security, UI/UX, …). Ranking is computed in Supabase by the `personal_feed()` function from your activity; works both anonymously (per browser session) and across devices when logged in
- **Login** — email/password accounts via Supabase Auth; a profile row is auto-created on signup
- **Player** — persistent bottom player with play/pause, seek, skip back 15s / forward 30s, and playback speed (1× / 1.25× / 1.5× / 2×)
- **Resume** — playback position is saved per episode and restored on the next play
- **Activity tracking** — play, pause, seek, 30-second progress heartbeats, completes, and show-note opens are queued in `localStorage` (`castit.activity.queue`) and flushed to the Supabase `activity_events` table (with `user_id` when logged in). These events both drive feed ranking and feed interest-based episode generation
- **Responsive** — single-column layout that works from phones to desktop

## Data modes

The API layer ([src/lib/api.ts](src/lib/api.ts)) picks a mode at build/run time:

| Mode | When | Data source |
|------|------|-------------|
| **Supabase** (default) | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set | Episodes via `personal_feed()` RPC, audio from the `episode-audio` storage bucket, activity into `activity_events` |
| **Static snapshot** | `VITE_STATIC_SNAPSHOT=true` (and no Supabase vars) | JSON + MP3s exported by `npm run snapshot` from a local backend |
| **Local Django** | neither set | `/api` + `/media` proxied to the backend by the Vite dev server |

The anon key is public by design — Supabase row-level security is what protects the data. `.env.production` (committed) configures the deployed site; `.env.local` (gitignored) configures dev.

## Getting Started

```bash
npm install
npm run dev
```

With `.env.local` present, dev runs against Supabase — no local backend needed. To develop against a local Django backend instead, remove the Supabase vars (and optionally set `CAST_IT_API_URL` if it's not on port 8000).

Publishing new episodes is a backend concern: run `make publish-supabase` in the backend repo and the deployed site updates on the next page load — no frontend rebuild required.

## Build & Deploy

```bash
npm run build         # local production build (dist/)
npm run build:pages   # GitHub Pages build (base /cast-it-frontend/, Supabase mode)
npm run preview:pages # serve the Pages build locally on :4173
```

Pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which builds and deploys to https://shuseiyokoi.github.io/cast-it-frontend/.
