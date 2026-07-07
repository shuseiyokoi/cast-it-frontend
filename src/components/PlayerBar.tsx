import { usePlayer } from '../player/PlayerContext'
import Cover from './Cover'
import { Back15Icon, Fwd30Icon, PauseIcon, PlayIcon } from './icons'

const RATES = [1, 1.25, 1.5, 2]

function fmt(t: number): string {
  if (!Number.isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PlayerBar() {
  const { episode, playing, currentTime, duration, rate, toggle, seek, skip, setRate } = usePlayer()

  if (!episode) return null

  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
      <div className="mx-auto max-w-2xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {/* Seek bar */}
        <div className="flex items-center gap-2 text-[11px] tabular-nums text-zinc-500">
          <span className="w-10 text-right">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || episode.duration_seconds || 0}
            step={1}
            value={Math.min(currentTime, duration || Infinity)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-violet-500"
          />
          <span className="w-10">{fmt(duration || episode.duration_seconds || 0)}</span>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <Cover id={episode.id} title={episode.title} className="h-10 w-10 rounded-lg text-xs" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-100">{episode.title}</div>
            <div className="text-[11px] text-zinc-500">{playing ? 'Playing' : 'Paused'}</div>
          </div>

          <button
            onClick={() => skip(-15)}
            aria-label="Back 15 seconds"
            className="p-1.5 text-zinc-400 transition-colors hover:text-white"
          >
            <Back15Icon className="h-6 w-6" />
          </button>
          <button
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-500"
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5 translate-x-[1px]" />}
          </button>
          <button
            onClick={() => skip(30)}
            aria-label="Forward 30 seconds"
            className="p-1.5 text-zinc-400 transition-colors hover:text-white"
          >
            <Fwd30Icon className="h-6 w-6" />
          </button>
          <button
            onClick={() => setRate(nextRate)}
            aria-label="Playback speed"
            className="w-11 rounded-lg border border-zinc-700 py-1 text-xs font-semibold tabular-nums text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            {rate}×
          </button>
        </div>
      </div>
    </div>
  )
}
