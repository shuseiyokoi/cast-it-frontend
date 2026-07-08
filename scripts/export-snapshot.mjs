// Exports a static snapshot of the Cast It backend for GitHub Pages.
//
// Fetches ready episodes (those with final audio), their details, and the
// audio files themselves from a locally running backend, and writes them to
// public/snapshot/ so the app can run without a live API.
//
//   node scripts/export-snapshot.mjs
//   CAST_IT_API_URL=http://localhost:32768 node scripts/export-snapshot.mjs

import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND = process.env.CAST_IT_API_URL ?? 'http://localhost:8000'
const API = `${BACKEND}/api/v1`
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'snapshot')

async function api(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`)
  return res.json()
}

async function downloadMedia(filePath) {
  const safe = normalize(filePath)
  if (safe.startsWith('..') || safe.startsWith('/')) {
    throw new Error(`Refusing unsafe media path: ${filePath}`)
  }
  const dest = join(OUT_DIR, 'media', safe)
  await mkdir(dirname(dest), { recursive: true })
  const res = await fetch(`${BACKEND}/media/${filePath}`)
  if (!res.ok) throw new Error(`GET /media/${filePath} → ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
  return dest
}

console.log(`Exporting snapshot from ${BACKEND} …`)

const [episodePage, assetPage] = await Promise.all([
  api('/episodes/?page_size=100'),
  api('/audio-assets/?is_final_episode_audio=true&status=ready&page_size=100'),
])

// Newest ready final asset per episode (mirrors the app's own selection).
const newestPerEpisode = new Map()
for (const asset of assetPage.results) {
  const prev = newestPerEpisode.get(asset.episode)
  if (!prev || (asset.generated_at ?? '') > (prev.generated_at ?? '')) {
    newestPerEpisode.set(asset.episode, asset)
  }
}

const assetDetails = {}
const episodeDetails = {}
let mediaBytes = 0

for (const [episodeId, asset] of newestPerEpisode) {
  const detail = await api(`/audio-assets/${asset.id}/`)
  if (!detail.file_path) continue
  const dest = await downloadMedia(detail.file_path)
  const { size } = await stat(dest)
  mediaBytes += size
  assetDetails[asset.id] = detail
  episodeDetails[episodeId] = await api(`/episodes/${episodeId}/`)
  console.log(`  ✓ ${detail.file_path} (${(size / 1e6).toFixed(1)} MB) — ${episodeDetails[episodeId].title}`)
}

// Only episodes with playable audio go public; in-production ones stay local.
const readyEpisodes = episodePage.results.filter((ep) => episodeDetails[ep.id])
const readyAssets = assetPage.results.filter((a) => assetDetails[a.id])

const snapshot = {
  exported_at: new Date().toISOString(),
  episodes: { count: readyEpisodes.length, next: null, previous: null, results: readyEpisodes },
  audioAssets: { count: readyAssets.length, next: null, previous: null, results: readyAssets },
  assetDetails,
  episodeDetails,
}

await mkdir(OUT_DIR, { recursive: true })
await writeFile(join(OUT_DIR, 'data.json'), JSON.stringify(snapshot, null, 2))

console.log(
  `Done: ${readyEpisodes.length} episode(s), ${(mediaBytes / 1e6).toFixed(1)} MB of audio → public/snapshot/`,
)
if (mediaBytes > 500e6) {
  console.warn('⚠ Snapshot exceeds 500 MB — GitHub Pages sites are limited to ~1 GB.')
}
