import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioAsset, Episode, EpisodeDetail, Paginated } from './types'

export const API_BASE = '/api/v1'

// Static-snapshot mode: instead of a live backend, answer API calls from a
// snapshot bundled at build time (see scripts/export-snapshot.mjs). Used for
// the GitHub Pages deployment.
export const STATIC_MODE = import.meta.env.VITE_STATIC_SNAPSHOT === 'true'

export function mediaUrl(filePath: string): string {
  return STATIC_MODE
    ? `${import.meta.env.BASE_URL}snapshot/media/${filePath}`
    : `/media/${filePath}`
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Snapshot {
  episodes: Paginated<Episode>
  audioAssets: Paginated<AudioAsset>
  assetDetails: Record<string, AudioAsset>
  episodeDetails: Record<string, EpisodeDetail>
}

let snapshotPromise: Promise<Snapshot> | null = null

function loadSnapshot(): Promise<Snapshot> {
  snapshotPromise ??= fetch(`${import.meta.env.BASE_URL}snapshot/data.json`).then((res) => {
    if (!res.ok) throw new ApiError(res.status, 'Episode snapshot not found')
    return res.json()
  })
  return snapshotPromise
}

async function staticApi<T>(path: string): Promise<T> {
  const snap = await loadSnapshot()
  if (path.startsWith('/episodes/?')) return snap.episodes as T
  if (path.startsWith('/audio-assets/?')) return snap.audioAssets as T
  const episode = path.match(/^\/episodes\/([^/]+)\/$/)
  if (episode && snap.episodeDetails[episode[1]]) return snap.episodeDetails[episode[1]] as T
  const asset = path.match(/^\/audio-assets\/([^/]+)\/$/)
  if (asset && snap.assetDetails[asset[1]]) return snap.assetDetails[asset[1]] as T
  throw new ApiError(404, `No snapshot data for ${path}`)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (STATIC_MODE) {
    if (init?.method && init.method !== 'GET') {
      throw new ApiError(405, 'Read-only in static mode')
    }
    return staticApi<T>(path)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? JSON.stringify(body)
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useApi<T>(path: string | null, pollMs?: number): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const first = useRef(true)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    if (first.current) setLoading(true)
    api<T>(path)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        first.current = false
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  useEffect(() => {
    if (!pollMs || path === null) return
    const id = setInterval(() => setTick((t) => t + 1), pollMs)
    return () => clearInterval(id)
  }, [pollMs, path])

  return { data, loading, error, refresh }
}
