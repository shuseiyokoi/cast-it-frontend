import { useEffect, useState } from 'react'
import { PlayerProvider, usePlayer } from './player/PlayerContext'
import PlayerBar from './components/PlayerBar'
import Home from './pages/Home'
import Account from './pages/Account'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AuthBar from './auth/AuthBar'

type View = 'home' | 'account'

function Shell() {
  const { episode } = usePlayer()
  const { user } = useAuth()
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    if (!user && view === 'account') setView('home')
  }, [user, view])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => setView('home')}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label="Back to home"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              className="h-10 w-10 rounded-xl"
            />
            <div className="min-w-0">
              <div className="text-lg font-bold leading-tight text-white">Cast It</div>
              <div className="text-xs text-zinc-500">Podcasts made from your interests</div>
            </div>
          </button>
          <AuthBar
            onOpenAccount={() => setView('account')}
            accountActive={view === 'account'}
          />
        </div>
      </header>

      <main className={`mx-auto max-w-2xl px-4 py-6 ${episode ? 'pb-36' : 'pb-10'}`}>
        {view === 'home' ? <Home /> : <Account />}
      </main>

      <PlayerBar />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <Shell />
      </PlayerProvider>
    </AuthProvider>
  )
}
