import { useEffect, useMemo, useState } from 'react'
import { api, mediaUrl, useApi } from '../lib/api'
import type { AudioAsset, Episode, EpisodeDetail, Paginated } from '../lib/types'
import { formatDate, formatDuration, titleCase } from '../lib/format'
import { getPosition, track } from '../lib/activity'
import { useAuth } from '../auth/AuthContext'
import InterestPicker from '../auth/InterestPicker'
import { usePlayer, type PlayableEpisode } from '../player/PlayerContext'
import Cover from '../components/Cover'
import { ClockIcon, PauseIcon, PlayIcon, SparkleIcon } from '../components/icons'
import { ErrorState, Spinner } from '../components/ui'

interface FeedEpisode extends Episode {
  audioUrl: string | null
}

function useFeed() {
  // The user id in the path makes the feed refetch (and re-rank) on login/logout.
  const { user } = useAuth()
  const episodes = useApi<Paginated<Episode>>(
    `/episodes/?page_size=50&u=${user?.id ?? ''}`,
    60000,
  )
  const finals = useApi<Paginated<AudioAsset>>(
    '/audio-assets/?is_final_episode_audio=true&status=ready&page_size=100',
    60000,
  )
  const [urls, setUrls] = useState<Record<string, string>>({})

  // The asset list omits file_path, so resolve the newest final asset
  // per episode via its detail endpoint.
  useEffect(() => {
    const assets = finals.data?.results.filter(
      (a) => a.is_final_episode_audio && a.status === 'ready',
    )
    if (!assets || assets.length === 0) return
    const newestPerEpisode = new Map<string, AudioAsset>()
    for (const a of assets) {
      const prev = newestPerEpisode.get(a.episode)
      if (!prev || (a.generated_at ?? '') > (prev.generated_at ?? '')) {
        newestPerEpisode.set(a.episode, a)
      }
    }
    let cancelled = false
    Promise.all(
      [...newestPerEpisode.values()].map((a) =>
        api<AudioAsset>(`/audio-assets/${a.id}/`).then(
          (full) => [a.episode, full.file_path] as const,
        ),
      ),
    ).then((pairs) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const [episodeId, filePath] of pairs) {
        if (filePath) next[episodeId] = mediaUrl(filePath)
      }
      setUrls(next)
    })
    return () => {
      cancelled = true
    }
  }, [finals.data])

  const feed: FeedEpisode[] | null = useMemo(() => {
    if (!episodes.data) return null
    return episodes.data.results.map((ep) => ({ ...ep, audioUrl: urls[ep.id] ?? null }))
  }, [episodes.data, urls])

  return { feed, loading: episodes.loading, error: episodes.error, refresh: episodes.refresh }
}

function ProgressLine({ episodeId, playingNow, currentTime, duration }: {
  episodeId: string
  playingNow: boolean
  currentTime: number
  duration: number
}) {
  const saved = getPosition(episodeId)
  const pos = playingNow ? currentTime : (saved?.position ?? 0)
  const dur = playingNow ? duration : (saved?.duration ?? 0)
  if (!dur || pos < 5) return null
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(pos / dur) * 100}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-zinc-500">
        {formatDuration(Math.max(0, dur - pos))} left
      </span>
    </div>
  )
}

function EpisodeRow({ episode }: { episode: FeedEpisode }) {
  const player = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)

  const isCurrent = player.episode?.id === episode.id
  const playingNow = isCurrent && player.playing

  function onPlayClick() {
    if (!episode.audioUrl) return
    if (isCurrent) {
      player.toggle()
    } else {
      const playable: PlayableEpisode = {
        id: episode.id,
        title: episode.title,
        publish_date: episode.publish_date,
        duration_seconds: episode.duration_seconds,
        audioUrl: episode.audioUrl,
      }
      player.play(playable)
    }
  }

  function onRowClick() {
    const next = !expanded
    setExpanded(next)
    if (next) {
      track('episode_open', episode)
      if (!detail) {
        api<EpisodeDetail>(`/episodes/${episode.id}/`).then(setDetail).catch(() => {})
      }
    }
  }

  return (
    <li className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 transition-colors hover:border-zinc-700">
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <Cover id={episode.id} title={episode.title} />
        <button onClick={onRowClick} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-semibold text-zinc-100 sm:text-base">
            {episode.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
            <span>{formatDate(episode.publish_date ?? episode.created_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {formatDuration(episode.duration_seconds)}
            </span>
          </div>
          <ProgressLine
            episodeId={episode.id}
            playingNow={isCurrent}
            currentTime={player.currentTime}
            duration={player.duration}
          />
        </button>
        <button
          onClick={onPlayClick}
          aria-label={playingNow ? `Pause ${episode.title}` : `Play ${episode.title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition-all hover:scale-105 hover:bg-violet-500"
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5 translate-x-[1px]" />}
        </button>
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-zinc-800/80 px-4 py-3">
          {!detail ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold leading-snug text-zinc-100 sm:text-base">
                {detail.title || episode.title}
              </h3>
              {(detail.keywords?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.keywords!.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] text-zinc-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-zinc-400">
                {detail.description || detail.summary || 'No description available.'}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  )
}

export default function Home() {
  const { feed, loading, error, refresh } = useFeed()

  const ready = feed?.filter((ep) => ep.audioUrl) ?? []
  const inProduction = feed?.filter((ep) => !ep.audioUrl) ?? []

  return (
    <div>
      <InterestPicker onSaved={refresh} />
      {loading && <Spinner label="Loading your episodes…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {feed && (
        <>
          {ready.length > 0 ? (
            <ul className="space-y-3">
              {ready.map((ep) => (
                <EpisodeRow key={ep.id} episode={ep} />
              ))}
            </ul>
          ) : (
            !loading && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-500">
                No episodes ready yet — your first one is on its way.
              </div>
            )
          )}

          {inProduction.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-400">
                <SparkleIcon className="h-4 w-4 text-violet-400" />
                Being made for you
              </h2>
              <ul className="space-y-2">
                {inProduction.map((ep) => (
                  <li
                    key={ep.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5"
                  >
                    <Cover id={ep.id} title={ep.title} className="h-9 w-9 rounded-lg text-[10px] opacity-60" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-400">{ep.title}</div>
                    </div>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-zinc-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                      {titleCase(ep.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
