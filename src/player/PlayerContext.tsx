/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clearPosition, getPosition, savePosition, track } from '../lib/activity'

export interface PlayableEpisode {
  id: string
  title: string
  description?: string
  publish_date: string | null
  duration_seconds: number | null
  audioUrl: string
}

interface PlayerState {
  episode: PlayableEpisode | null
  playing: boolean
  currentTime: number
  duration: number
  rate: number
  play: (episode: PlayableEpisode) => void
  toggle: () => void
  seek: (time: number) => void
  skip: (delta: number) => void
  setRate: (rate: number) => void
}

const PlayerContext = createContext<PlayerState | null>(null)

const HEARTBEAT_SECONDS = 30

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [episode, setEpisode] = useState<PlayableEpisode | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRateState] = useState(1)
  const lastHeartbeat = useRef(0)

  function audio(): HTMLAudioElement {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }
    return audioRef.current
  }

  // Wire audio element events once.
  useEffect(() => {
    const el = audio()
    const onTime = () => {
      setCurrentTime(el.currentTime)
      const ep = epRef.current
      if (!ep) return
      savePosition(ep.id, el.currentTime, el.duration || 0)
      if (el.currentTime - lastHeartbeat.current >= HEARTBEAT_SECONDS) {
        lastHeartbeat.current = el.currentTime
        track('episode_progress', ep, el.currentTime, el.duration)
      }
    }
    const onMeta = () => setDuration(el.duration || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      const ep = epRef.current
      if (ep) {
        track('episode_complete', ep, el.duration, el.duration)
        clearPosition(ep.id)
      }
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  // Keep a ref to the current episode for event handlers.
  const epRef = useRef<PlayableEpisode | null>(null)
  useEffect(() => {
    epRef.current = episode
  }, [episode])

  const play = useCallback((ep: PlayableEpisode) => {
    const el = audio()
    if (epRef.current?.id === ep.id) {
      void el.play()
      track('episode_play', ep, el.currentTime, el.duration)
      return
    }
    setEpisode(ep)
    el.src = ep.audioUrl
    const saved = getPosition(ep.id)
    // Resume unless the episode was nearly finished.
    if (saved && saved.duration > 0 && saved.position < saved.duration - 10) {
      el.currentTime = saved.position
      setCurrentTime(saved.position)
    } else {
      setCurrentTime(0)
    }
    lastHeartbeat.current = el.currentTime
    void el.play()
    track('episode_play', ep, el.currentTime, ep.duration_seconds)
  }, [])

  const toggle = useCallback(() => {
    const el = audio()
    const ep = epRef.current
    if (!ep) return
    if (el.paused) {
      void el.play()
      track('episode_play', ep, el.currentTime, el.duration)
    } else {
      el.pause()
      track('episode_pause', ep, el.currentTime, el.duration)
    }
  }, [])

  const seek = useCallback((time: number) => {
    const el = audio()
    el.currentTime = time
    setCurrentTime(time)
    const ep = epRef.current
    if (ep) track('episode_seek', ep, time, el.duration)
  }, [])

  const skip = useCallback(
    (delta: number) => {
      const el = audio()
      seek(Math.min(Math.max(0, el.currentTime + delta), el.duration || Infinity))
    },
    [seek],
  )

  const setRate = useCallback((r: number) => {
    audio().playbackRate = r
    setRateState(r)
  }, [])

  const value = useMemo(
    () => ({ episode, playing, currentTime, duration, rate, play, toggle, seek, skip, setRate }),
    [episode, playing, currentTime, duration, rate, play, toggle, seek, skip, setRate],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
