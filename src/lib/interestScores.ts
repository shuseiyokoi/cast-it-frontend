import { sessionId, SUPABASE_MODE, supabase } from './supabase'

export interface InterestScoreRow {
  tag_slug: string
  tag_name: string
  seconds: number
}

export interface InterestSlice {
  tag_slug: string
  tag_name: string
  seconds: number
  percent: number
}

/** Same session id + scoring identity as personal_feed. */
export async function fetchInterestScores(): Promise<InterestSlice[]> {
  if (!SUPABASE_MODE || !supabase) {
    throw new Error('Interest scores are only available in Supabase mode')
  }
  const { data, error } = await supabase.rpc('interest_scores', {
    p_session_id: sessionId(),
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as InterestScoreRow[]
  const total = rows.reduce((sum, row) => sum + row.seconds, 0)
  if (total <= 0) return []

  // Largest-remainder so percents always sum to 100.
  const raw = rows.map((row) => {
    const exact = (100 * row.seconds) / total
    return { ...row, exact, percent: Math.floor(exact) }
  })
  let remainder = 100 - raw.reduce((sum, row) => sum + row.percent, 0)
  const byFrac = [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))
  for (const row of byFrac) {
    if (remainder <= 0) break
    row.percent += 1
    remainder -= 1
  }
  return raw
    .map(({ tag_slug, tag_name, seconds, percent }) => ({
      tag_slug,
      tag_name,
      seconds,
      percent,
    }))
    .filter((row) => row.percent > 0)
}
