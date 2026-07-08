import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

export default function AuthBar() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!auth.enabled) return null

  if (auth.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-32 truncate text-xs text-zinc-400">{auth.user.email}</span>
        <button
          onClick={() => void auth.signOut()}
          className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
        >
          Sign out
        </button>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fail =
      mode === 'signin'
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password)
    setBusy(false)
    if (fail) {
      setError(fail)
    } else {
      setOpen(false)
      setEmail('')
      setPassword('')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
      >
        Sign in
      </button>
      {open && (
        <form
          onSubmit={onSubmit}
          className="absolute right-0 top-10 z-30 w-64 space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        >
          <div className="flex gap-1 text-xs">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-2 py-1.5 font-semibold transition-colors ${
                  mode === m ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-violet-600 px-2.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
      )}
    </div>
  )
}
