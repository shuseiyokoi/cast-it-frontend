// Listening-activity tracker. Events are queued in localStorage so the
// backend can later ingest them for interest-based episode generation.
// Set VITE_ACTIVITY_ENDPOINT to POST batches; until then events stay queued.

export type ActivityType =
  | 'episode_play'
  | 'episode_pause'
  | 'episode_seek'
  | 'episode_progress'
  | 'episode_complete'
  | 'episode_open'

export interface ActivityEvent {
  type: ActivityType
  episode_id: string
  episode_title: string
  position_seconds: number | null
  duration_seconds: number | null
  session_id: string
  occurred_at: string
}

const QUEUE_KEY = 'castit.activity.queue'
const MAX_QUEUE = 500

const ENDPOINT: string | undefined = import.meta.env.VITE_ACTIVITY_ENDPOINT

import { SUPABASE_MODE, sessionId, supabase } from './supabase'

function readQueue(): ActivityEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeQueue(queue: ActivityEvent[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)))
}

let flushing = false

async function flush() {
  if ((!SUPABASE_MODE && !ENDPOINT) || flushing) return
  const queue = readQueue()
  if (queue.length === 0) return
  flushing = true
  try {
    if (SUPABASE_MODE) {
      const { data } = await supabase!.auth.getSession()
      const userId = data.session?.user.id ?? null
      // The activity_events table has no episode_title column.
      const rows = queue.map(({ episode_title: _title, ...row }) => ({
        ...row,
        user_id: userId,
      }))
      const { error } = await supabase!.from('activity_events').insert(rows)
      if (!error) writeQueue([])
    } else {
      const res = await fetch(ENDPOINT!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: queue }),
      })
      if (res.ok) writeQueue([])
    }
  } catch {
    /* stay queued for the next flush */
  } finally {
    flushing = false
  }
}

export function track(
  type: ActivityType,
  episode: { id: string; title: string },
  position: number | null = null,
  duration: number | null = null,
) {
  const event: ActivityEvent = {
    type,
    episode_id: episode.id,
    episode_title: episode.title,
    position_seconds: position != null ? Math.round(position) : null,
    duration_seconds: duration != null ? Math.round(duration) : null,
    session_id: sessionId(),
    occurred_at: new Date().toISOString(),
  }
  writeQueue([...readQueue(), event])
  void flush()
}

export function getQueuedActivity(): ActivityEvent[] {
  return readQueue()
}

// --- playback position persistence (resume where you left off) ---

const POSITION_KEY = 'castit.positions'

interface SavedPosition {
  position: number
  duration: number
  updated_at: string
}

function readPositions(): Record<string, SavedPosition> {
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function savePosition(episodeId: string, position: number, duration: number) {
  const positions = readPositions()
  positions[episodeId] = {
    position: Math.round(position),
    duration: Math.round(duration),
    updated_at: new Date().toISOString(),
  }
  localStorage.setItem(POSITION_KEY, JSON.stringify(positions))
}

export function getPosition(episodeId: string): SavedPosition | null {
  return readPositions()[episodeId] ?? null
}

export function clearPosition(episodeId: string) {
  const positions = readPositions()
  delete positions[episodeId]
  localStorage.setItem(POSITION_KEY, JSON.stringify(positions))
}
