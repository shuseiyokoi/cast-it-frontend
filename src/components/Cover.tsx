// Deterministic gradient cover art derived from the episode id.
const GRADIENTS = [
  'from-violet-600 to-fuchsia-500',
  'from-sky-600 to-cyan-400',
  'from-emerald-600 to-lime-400',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-pink-400',
  'from-indigo-600 to-blue-400',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function Cover({
  id,
  title,
  className = 'h-14 w-14 rounded-xl text-base',
}: {
  id: string
  title: string
  className?: string
}) {
  const gradient = GRADIENTS[hash(id) % GRADIENTS.length]
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br font-bold text-white/90 ${gradient} ${className}`}
    >
      {initials}
    </div>
  )
}
