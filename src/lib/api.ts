import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioAsset, Episode, EpisodeDetail, Paginated } from './types'

import { SUPABASE_MODE, sessionId, supabase } from './supabase'

export const API_BASE = '/api/v1'

// Static-snapshot mode: instead of a live backend, answer API calls from a
// snapshot bundled at build time (see scripts/export-snapshot.mjs).
export const STATIC_MODE =
  !SUPABASE_MODE && import.meta.env.VITE_STATIC_SNAPSHOT === 'true'

export function mediaUrl(filePath: string): string {
  if (filePath.startsWith('http')) return filePath
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

// Rows in the Supabase `episodes` table (see the backend's supabase/migrations).
interface SupabaseEpisodeRow {
  id: string
  title: string
  description: string
  summary: string
  language: string
  publish_date: string | null
  duration_seconds: number | null
  audio_url: string
  cover_url: string | null
  category: string
  created_at: string
  updated_at: string
}

let supabaseRowsPromise: Promise<SupabaseEpisodeRow[]> | null = null

// The feed comes from personal_feed(): episodes ranked by how much the
// caller has listened to each category (logged-in user or anonymous session).
async function fetchSupabaseRows(): Promise<SupabaseEpisodeRow[]> {
  const { data, error } = await supabase!.rpc('personal_feed', {
    p_session_id: sessionId(),
  })
  if (error) throw new ApiError(500, error.message)
  return (data ?? []) as SupabaseEpisodeRow[]
}

function loadSupabaseRows(force = false): Promise<SupabaseEpisodeRow[]> {
  if (force) supabaseRowsPromise = null
  supabaseRowsPromise ??= fetchSupabaseRows().catch((error: unknown) => {
    supabaseRowsPromise = null
    throw error
  })
  return supabaseRowsPromise
}

function toEpisode(row: SupabaseEpisodeRow): Episode {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    publish_date: row.publish_date,
    status: 'completed',
    duration_seconds: row.duration_seconds,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Answers the same paths the Django API serves, so the UI needs no changes.
// Every published row has final audio; its "asset detail" is the audio URL.
async function supabaseApi<T>(path: string): Promise<T> {
  if (path.startsWith('/episodes/?')) {
    const rows = await loadSupabaseRows(true)
    const results = rows.map(toEpisode)
    return { count: results.length, next: null, previous: null, results } as T
  }
  if (path.startsWith('/audio-assets/?')) {
    const rows = await loadSupabaseRows()
    const results = rows.map((row) => ({
      id: row.id,
      episode: row.id,
      is_final_episode_audio: true,
      status: 'ready',
      generated_at: row.updated_at,
    })) as AudioAsset[]
    return { count: results.length, next: null, previous: null, results } as T
  }
  const episode = path.match(/^\/episodes\/([^/]+)\/$/)
  const asset = path.match(/^\/audio-assets\/([^/]+)\/$/)
  const id = episode?.[1] ?? asset?.[1]
  if (id) {
    const rows = await loadSupabaseRows()
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ApiError(404, `Episode ${id} not found`)
    if (asset) return { file_path: row.audio_url } as T
    return {
      ...toEpisode(row),
      description: row.description,
      summary: row.summary,
      cover_image: row.cover_url,
    } as T
  }
  throw new ApiError(404, `No Supabase data for ${path}`)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (SUPABASE_MODE) {
    if (init?.method && init.method !== 'GET') {
      throw new ApiError(405, 'Read-only in Supabase mode')
    }
    return supabaseApi<T>(path)
  }
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
