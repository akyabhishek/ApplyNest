import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Copy, PlusCircle, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { sendRuntimeMessage } from '../shared/messaging'
import { searchAll } from '../shared/storage'
import type { RecentCopyItem, SearchResultItem } from '../shared/types'

const categoryColor: Record<string, string> = {
  personal: 'bg-cyan-400/20 text-cyan-100',
  professional: 'bg-amber-400/20 text-amber-100',
  education: 'bg-lime-400/20 text-lime-100',
  links: 'bg-fuchsia-400/20 text-fuchsia-100',
  template: 'bg-emerald-400/20 text-emerald-100',
  faq: 'bg-blue-400/20 text-blue-100'
}

async function fetchSearchResults(query: string) {
  try {
    return await sendRuntimeMessage<SearchResultItem[]>({
      type: 'SEARCH_ITEMS',
      payload: { query }
    })
  } catch {
    return searchAll(query)
  }
}

async function fetchRecentItems() {
  return sendRuntimeMessage<RecentCopyItem[]>({ type: 'GET_RECENT' })
}

export function PopupApp() {
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const queryClient = useQueryClient()

  const { data: results = [] } = useQuery({
    queryKey: ['search-results', query],
    queryFn: () => fetchSearchResults(query)
  })

  const { data: recent = [] } = useQuery({
    queryKey: ['recent-copies'],
    queryFn: fetchRecentItems
  })

  const topFive = useMemo(() => results.slice(0, 8), [results])

  const handleCopy = async (item: SearchResultItem) => {
    try {
      if (item.fieldId) {
        await sendRuntimeMessage<{ value: string | null }>({
          type: 'COPY_FIELD',
          payload: { fieldId: item.fieldId }
        })
      }

      await navigator.clipboard.writeText(item.value)
      setFeedback(`Copied ${item.label}`)
      await queryClient.invalidateQueries({ queryKey: ['recent-copies'] })
    } catch {
      setFeedback('Copy failed. Try again.')
    }
  }

  const openVaultSettings = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      await chrome.runtime.openOptionsPage()
    }
  }

  return (
    <main className="min-h-[560px] w-[380px] p-4 text-white">
      <section className="applynest-glass rounded-2xl p-4 shadow-2xl">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ApplyNest logo" className="h-8 w-8 rounded-md object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">ApplyNest</p>
              <h1 className="mt-1 text-lg font-semibold">Quick Launcher</h1>
            </div>
          </div>
          <Sparkles className="h-5 w-5 text-cyan-200" />
        </header>

        <button
          type="button"
          onClick={openVaultSettings}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/20 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/25"
        >
          <PlusCircle className="h-4 w-4" />
          Add or Edit Details
        </button>

        <label className="relative mb-3 block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, github, salary..."
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-300"
          />
        </label>

        <div className="space-y-2">
          {topFive.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleCopy(item)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-left transition hover:border-cyan-200/50 hover:bg-slate-900/70"
            >
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block max-w-[220px] truncate text-xs text-slate-300">
                  {item.value}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${categoryColor[item.category] ?? 'bg-white/20 text-white'}`}
                >
                  {item.category}
                </span>
                <Copy className="h-4 w-4 text-cyan-200/85" />
              </span>
            </motion.button>
          ))}
          {!topFive.length && (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-300">
              No saved details found. Click{' '}
              <span className="font-semibold text-cyan-200">Add or Edit Details</span> to add your
              profile info.
            </div>
          )}
        </div>

        <footer className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <p className="text-xs text-slate-300">Recent copied</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-200">
            {recent.slice(0, 3).map((item) => (
              <li key={item.id} className="truncate">
                {item.label}: {item.value}
              </li>
            ))}
            {!recent.length && <li className="text-slate-400">Nothing copied yet.</li>}
          </ul>
          {feedback && <p className="mt-2 text-xs text-emerald-300">{feedback}</p>}
        </footer>
      </section>
    </main>
  )
}
