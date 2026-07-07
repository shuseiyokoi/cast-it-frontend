import { PlayerProvider, usePlayer } from './player/PlayerContext'
import PlayerBar from './components/PlayerBar'
import Home from './pages/Home'

function Shell() {
  const { episode } = usePlayer()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <img src="/logo.svg" alt="Cast It" className="h-10 w-10 rounded-xl" />
          <div>
            <div className="text-lg font-bold leading-tight text-white">Cast It</div>
            <div className="text-xs text-zinc-500">Podcasts made from your interests</div>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl px-4 py-6 ${episode ? 'pb-36' : 'pb-10'}`}>
        <Home />
      </main>

      <PlayerBar />
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  )
}
