export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-zinc-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
      <p className="text-sm text-rose-400">Failed to load: {message}</p>
      <p className="mt-2 text-xs text-zinc-500">
        Make sure the Cast It backend is running (default: http://localhost:8000).
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Retry
        </button>
      )}
    </div>
  )
}
