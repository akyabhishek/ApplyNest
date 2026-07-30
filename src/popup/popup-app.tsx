import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Copy, PlusCircle, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getIconEntry } from '../shared/icon-map'
import { sendRuntimeMessage } from '../shared/messaging'
import { searchAll } from '../shared/storage'
import type { RecentCopyItem, SearchResultItem } from '../shared/types'

const categoryColor: Record<string, string> = {
  personal: 'bg-indigo-500/10 text-indigo-300',
  professional: 'bg-amber-500/10 text-amber-300',
  education: 'bg-emerald-500/10 text-emerald-300',
  links: 'bg-violet-500/10 text-violet-300',
  template: 'bg-teal-500/10 text-teal-300',
  faq: 'bg-sky-500/10 text-sky-300'
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
      <section className="applynest-glass rounded-xl p-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="ApplyNest logo" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">ApplyNest</p>
              <h1 className="text-base font-semibold tracking-tight">Quick Launcher</h1>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </header>

        <button
          type="button"
          onClick={openVaultSettings}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2.5 text-sm font-medium text-indigo-300 transition-all duration-200 hover:bg-indigo-500/20 active:scale-[0.98]"
        >
          <PlusCircle className="h-4 w-4" />
          Add or Edit Details
        </button>

        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, github, salary..."
            className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 py-2.5 pl-9 pr-3 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
          />
        </label>

        <div className="space-y-2">
          {topFive.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              onClick={() => handleCopy(item)}
              className="group flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-zinc-900/60 px-3 py-2.5 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-zinc-900/90 active:scale-[0.99]"
            >
              <span>
                <span className="flex items-center gap-1.5">
                  {item.icon &&
                    (() => {
                      const entry = getIconEntry(item.icon)
                      if (!entry) return null
                      const Icon = entry.component
                      return <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    })()}
                  <span className="block text-sm font-medium">{item.label}</span>
                </span>
                <span className="block max-w-[220px] truncate text-xs text-zinc-400">
                  {item.value}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide ${categoryColor[item.category] ?? 'bg-white/10 text-zinc-300'}`}
                >
                  {item.category}
                </span>
                <Copy className="h-3.5 w-3.5 text-zinc-500 transition-colors group-hover:text-indigo-400" />
              </span>
            </motion.button>
          ))}
          {!topFive.length && (
            <div className="rounded-lg border border-white/[0.06] bg-zinc-900/40 p-4 text-sm text-zinc-400">
              No saved details found. Click{' '}
              <span className="font-medium text-indigo-400">Add or Edit Details</span> to add your
              profile info.
            </div>
          )}
        </div>

        <footer className="mt-5 rounded-lg border border-white/[0.06] bg-zinc-950/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Recent copied</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-300">
            {recent.slice(0, 3).map((item) => (
              <li key={item.id} className="truncate">
                {item.label}: {item.value}
              </li>
            ))}
            {!recent.length && <li className="text-zinc-500">Nothing copied yet.</li>}
          </ul>
          {feedback && <p className="mt-2 text-xs text-emerald-400">{feedback}</p>}
          <p className="mt-2 text-[10px] text-zinc-600">
            Side panel:{' '}
            <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-zinc-400">Alt+J</kbd>
          </p>
        </footer>
      </section>
    </main>
  )
}
