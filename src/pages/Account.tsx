import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { SUPABASE_MODE, supabase } from '../lib/supabase'
import { fetchInterestScores, type InterestSlice } from '../lib/interestScores'
import { Spinner } from '../components/ui'

const DONUT_COLORS = [
  '#8b5cf6', // violet-500
  '#22d3ee', // cyan-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#fb7185', // rose-400
]

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle)
  const end = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

function InterestDonut({ slices }: { slices: InterestSlice[] }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 78
  const stroke = 28

  // Single full ring when only one tag.
  if (slices.length === 1) {
    const color = DONUT_COLORS[0]
    return (
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
          />
          <circle cx={cx} cy={cy} r={radius - stroke / 2 - 8} fill="#18181b" />
        </svg>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm text-zinc-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            <span className="font-medium">{slices[0].tag_name}</span>
            <span className="tabular-nums text-zinc-400">{slices[0].percent}%</span>
          </li>
        </ul>
      </div>
    )
  }

  let angle = 0
  const segments = slices.map((slice, i) => {
    const sweep = (slice.percent / 100) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return {
      ...slice,
      start,
      end,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      mid: start + sweep / 2,
    }
  })

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {segments.map((seg) => (
          <path
            key={seg.tag_slug}
            d={arcPath(cx, cy, radius, seg.start, seg.end)}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r={radius - stroke / 2 - 8} fill="#18181b" />
        {/* 12 o'clock tick, matching the sketch */}
        <line
          x1={cx}
          y1={cy - radius - stroke / 2 - 2}
          x2={cx}
          y2={cy - radius + stroke / 2 + 2}
          stroke="#a1a1aa"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <ul className="min-w-[10rem] space-y-2.5">
        {segments.map((seg) => (
          <li key={seg.tag_slug} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="font-medium text-zinc-100">{seg.tag_name}</span>
            <span className="ml-auto tabular-nums text-zinc-400">{seg.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Account() {
  const { user } = useAuth()
  const [slices, setSlices] = useState<InterestSlice[] | null>(null)
  const [interestLabels, setInterestLabels] = useState<string[]>([])
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!SUPABASE_MODE || !supabase) {
      setLoading(false)
      setError(null)
      setSlices([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const profilePromise = user
      ? supabase
          .from('profiles')
          .select('display_name, interests')
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({
          data: null as { display_name: string | null; interests: string[] | null } | null,
          error: null,
        })

    Promise.all([fetchInterestScores(), profilePromise, supabase.from('tags').select('slug,name')])
      .then(([scores, profile, tagRows]) => {
        if (cancelled) return
        setSlices(scores)
        const nameBySlug = new Map(
          ((tagRows.data as { slug: string; name: string }[] | null) ?? []).map((t) => [
            t.slug,
            t.name,
          ]),
        )
        if (profile.data) {
          setDisplayName(profile.data.display_name ?? null)
          const slugs = (profile.data.interests as string[] | null) ?? []
          setInterestLabels(slugs.map((slug) => nameBySlug.get(slug) ?? slug))
        } else {
          setDisplayName(null)
          setInterestLabels([])
        }
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, tick])

  if (!SUPABASE_MODE) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
        Recommendation scores are only available when connected to Supabase.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-white">Account info</h1>
        <p className="mt-1 text-sm text-zinc-500">
          How Cast It weights your feed — listening history plus declared interests.
        </p>
        {(user || displayName) && (
          <p className="mt-3 truncate text-sm text-zinc-300">
            {displayName || user?.email}
            {displayName && user?.email ? (
              <span className="text-zinc-500"> · {user.email}</span>
            ) : null}
          </p>
        )}
      </div>

      {loading && <Spinner label="Loading your recommendation score…" />}
      {error && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm text-rose-400">Failed to load: {error}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {error.includes('interest_scores')
              ? 'Apply the interest_scores migration on Supabase (SQL Editor), then Retry.'
              : 'Check your Supabase connection and try again.'}
          </p>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && slices && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-8 sm:px-8">
          {slices.length > 0 ? (
            <>
              <p className="mb-6 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
                Recommendation mix
              </p>
              <InterestDonut slices={slices} />
            </>
          ) : (
            <div className="py-6 text-center text-sm text-zinc-500">
              No recommendation score yet. Pick a few interests on the home feed
              or listen to an episode — your mix will show up here.
            </div>
          )}
        </div>
      )}

      {interestLabels.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Declared interests</h2>
          <div className="flex flex-wrap gap-1.5">
            {interestLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
