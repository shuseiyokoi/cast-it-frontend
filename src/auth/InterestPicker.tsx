import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface TagOption {
  slug: string
  name: string
}

const DISMISS_KEY = 'castit.interests.dismissed'

// Onboarding card: logged-in listeners with no declared interests pick the
// tags they care about; picks act as a decaying prior in personal_feed.
export default function InterestPicker({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth()
  const [tags, setTags] = useState<TagOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supabase || !user || localStorage.getItem(DISMISS_KEY)) {
      setVisible(false)
      return
    }
    let cancelled = false
    Promise.all([
      supabase.from('profiles').select('interests').eq('user_id', user.id).maybeSingle(),
      supabase.from('tags').select('slug,name').order('name'),
    ]).then(([profile, tagRows]) => {
      if (cancelled) return
      const interests = (profile.data?.interests as string[] | null) ?? []
      if (interests.length > 0) return
      setTags((tagRows.data as TagOption[] | null) ?? [])
      setVisible(true)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!visible || !user) return null

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase!
      .from('profiles')
      .upsert({ user_id: user!.id, interests: [...selected] })
    setSaving(false)
    if (!error) {
      setVisible(false)
      onSaved()
    }
  }

  function skip() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="mb-6 rounded-2xl border border-violet-800/50 bg-violet-950/20 p-4">
      <div className="mb-1 text-sm font-semibold text-zinc-100">
        What are you into?
      </div>
      <p className="mb-3 text-xs text-zinc-400">
        Pick a few topics to shape your feed — your listening takes over from there.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selected.has(tag.slug)
          return (
            <button
              key={tag.slug}
              onClick={() => toggle(tag.slug)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? 'border-violet-500 bg-violet-600 text-white'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={selected.size === 0 || saving}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
        >
          {saving ? 'Saving…' : `Save ${selected.size || ''}`.trim()}
        </button>
        <button onClick={skip} className="text-xs text-zinc-500 hover:text-zinc-300">
          Skip for now
        </button>
      </div>
    </div>
  )
}
