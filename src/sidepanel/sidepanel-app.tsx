import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, Copy, PlusCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { sendRuntimeMessage } from '../shared/messaging'
import type { SearchResultItem } from '../shared/types'

type SortOption = 'relevance' | 'label_asc' | 'label_desc' | 'category' | 'user_order'

const SORT_STORAGE_KEY = 'applynest_sidepanel_sort'
const USER_ORDER_STORAGE_KEY = 'applynest_sidepanel_user_order'

export function SidepanelApp() {
  const [query, setQuery] = useState('')
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [failedItemId, setFailedItemId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fields' | 'templates'>('fields')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [arrangeMode, setArrangeMode] = useState(false)
  const [userOrder, setUserOrder] = useState<string[]>([])
  const queryClient = useQueryClient()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY) as SortOption | null
      if (!saved) return

      if (
        saved === 'relevance' ||
        saved === 'label_asc' ||
        saved === 'label_desc' ||
        saved === 'category' ||
        saved === 'user_order'
      ) {
        setSortBy(saved)
      }
    } catch {
      // Ignore localStorage failures in restricted extension contexts.
    }
  }, [])

  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(USER_ORDER_STORAGE_KEY)
      if (!savedOrder) return

      const parsed = JSON.parse(savedOrder) as unknown
      if (!Array.isArray(parsed)) return

      const validOrder = parsed.filter((entry): entry is string => typeof entry === 'string')
      setUserOrder(validOrder)
    } catch {
      // Ignore invalid stored order payloads.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy)
    } catch {
      // Ignore localStorage failures in restricted extension contexts.
    }
  }, [sortBy])

  useEffect(() => {
    try {
      localStorage.setItem(USER_ORDER_STORAGE_KEY, JSON.stringify(userOrder))
    } catch {
      // Ignore localStorage failures in restricted extension contexts.
    }
  }, [userOrder])

  const { data: results = [] } = useQuery({
    queryKey: ['sidepanel-default-results', query],
    queryFn: () =>
      sendRuntimeMessage<SearchResultItem[]>({
        type: 'SEARCH_ITEMS',
        payload: { query }
      })
  })

  useEffect(() => {
    const activeFieldIds = results
      .filter((item) => Boolean(item.fieldId))
      .map((item) => item.fieldId as string)

    if (!activeFieldIds.length) return

    setUserOrder((prev) => {
      const kept = prev.filter((fieldId) => activeFieldIds.includes(fieldId))
      const missing = activeFieldIds.filter((fieldId) => !kept.includes(fieldId))
      return [...kept, ...missing]
    })
  }, [results])

  const topResults = useMemo(() => {
    const filtered = results.filter(
      (item) =>
        item.value.trim().length > 0 &&
        (activeTab === 'fields' ? item.category !== 'template' : item.category === 'template')
    )
    const sorted = [...filtered]

    if (sortBy === 'label_asc') {
      sorted.sort((a, b) => a.label.localeCompare(b.label))
    } else if (sortBy === 'label_desc') {
      sorted.sort((a, b) => b.label.localeCompare(a.label))
    } else if (sortBy === 'category') {
      sorted.sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category)
        if (categoryCompare !== 0) return categoryCompare
        return a.label.localeCompare(b.label)
      })
    } else if (sortBy === 'user_order') {
      const orderMap = new Map(userOrder.map((fieldId, index) => [fieldId, index]))

      sorted.sort((a, b) => {
        const aIndex = a.fieldId ? orderMap.get(a.fieldId) : undefined
        const bIndex = b.fieldId ? orderMap.get(b.fieldId) : undefined

        const aHasOrder = aIndex !== undefined
        const bHasOrder = bIndex !== undefined

        if (aHasOrder && bHasOrder) {
          return (aIndex as number) - (bIndex as number)
        }
        if (aHasOrder) return -1
        if (bHasOrder) return 1

        return a.label.localeCompare(b.label)
      })
    }

    return sorted.slice(0, 20)
  }, [results, sortBy, userOrder, activeTab])

  const userOrderIndexMap = useMemo(
    () => new Map(userOrder.map((fieldId, index) => [fieldId, index])),
    [userOrder]
  )

  const moveInUserOrder = (fieldId: string, direction: 'up' | 'down') => {
    setUserOrder((prev) => {
      const currentIndex = prev.indexOf(fieldId)
      if (currentIndex === -1) return prev

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const next = [...prev]
      const temp = next[currentIndex]
      next[currentIndex] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  const handleCopy = async (item: SearchResultItem) => {
    try {
      if (item.fieldId) {
        await sendRuntimeMessage<{ value: string | null }>({
          type: 'COPY_FIELD',
          payload: { fieldId: item.fieldId }
        })
      }

      await navigator.clipboard.writeText(item.value)
      setCopiedItemId(item.id)
      setFailedItemId(null)
      await queryClient.invalidateQueries({ queryKey: ['recent-copies'] })

      window.setTimeout(() => {
        setCopiedItemId((prev) => (prev === item.id ? null : prev))
      }, 1200)
    } catch {
      setFailedItemId(item.id)
      window.setTimeout(() => {
        setFailedItemId((prev) => (prev === item.id ? null : prev))
      }, 1500)
    }
  }

  const openVaultSettings = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      await chrome.runtime.openOptionsPage()
    }
  }

  return (
    <main className="min-h-screen p-1.5 text-white sm:p-2">
      <section className="applynest-glass rounded-xl p-2">
        <header className="mb-1.5 flex items-center justify-between gap-2">
          <h1 className="text-xs font-semibold tracking-wide text-slate-100">ApplyNest</h1>
          <button
            type="button"
            onClick={openVaultSettings}
            aria-label="Add or edit details"
            title="Add or edit details"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-cyan-300/45 bg-cyan-400/15 text-cyan-100 transition hover:bg-cyan-300/25"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="mb-1 inline-flex rounded-md border border-white/15 bg-slate-950/35 p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('fields')
            }}
            className={`rounded px-2 py-1 text-[10px] font-semibold transition ${
              activeTab === 'fields'
                ? 'bg-cyan-400 text-slate-950'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('templates')
              setArrangeMode(false)
            }}
            className={`rounded px-2 py-1 text-[10px] font-semibold transition ${
              activeTab === 'templates'
                ? 'bg-emerald-400 text-slate-950'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            Templates
          </button>
        </div>

        <div className="mt-1 flex items-center gap-1">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-slate-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search details"
              className="h-7 w-full rounded-md border border-white/20 bg-slate-900/70 py-1 pl-6 pr-2 text-[11px] outline-none transition focus:border-cyan-300"
            />
          </label>

          <select
            value={sortBy}
            onChange={(event) => {
              const nextSort = event.target.value as SortOption
              setSortBy(nextSort)
              if (nextSort !== 'user_order') {
                setArrangeMode(false)
              }
            }}
            aria-label="Arrange details"
            className="h-7 rounded-md border border-white/20 bg-slate-900/70 px-1.5 text-[10px] text-slate-200 outline-none transition focus:border-cyan-300"
          >
            <option value="relevance">Relevance</option>
            <option value="label_asc">A-Z</option>
            <option value="label_desc">Z-A</option>
            <option value="category">Category</option>
            <option value="user_order">My Order</option>
          </select>
        </div>

        {sortBy === 'user_order' && activeTab === 'fields' && (
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setArrangeMode((prev) => !prev)}
              className="h-6 rounded-md border border-cyan-300/45 bg-cyan-400/15 px-2 text-[10px] font-medium text-cyan-100"
            >
              {arrangeMode ? 'Done Arranging' : 'Arrange'}
            </button>
          </div>
        )}

        <ul className="mt-1.5 grid grid-cols-2 gap-1">
          {topResults.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleCopy(item)}
                title={item.label}
                className={`flex h-11 w-full items-center justify-between gap-1 rounded-md border px-1.5 text-left transition ${
                  copiedItemId === item.id
                    ? 'border-emerald-300/70 bg-emerald-400/20'
                    : failedItemId === item.id
                      ? 'border-rose-300/70 bg-rose-400/20'
                      : 'border-white/10 bg-slate-900/50 hover:border-cyan-200/50 hover:bg-slate-900/70'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold leading-none text-slate-100">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] leading-none text-slate-300/90">
                    {item.value}
                  </span>
                </span>
                {arrangeMode && item.fieldId ? (
                  <span className="ml-1 flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      aria-label={`Move ${item.label} up`}
                      title="Move up"
                      onClick={(event) => {
                        event.stopPropagation()
                        moveInUserOrder(item.fieldId as string, 'up')
                      }}
                      disabled={(userOrderIndexMap.get(item.fieldId) ?? 0) === 0}
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-white/15 text-slate-200 disabled:opacity-40"
                    >
                      <ChevronUp className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.label} down`}
                      title="Move down"
                      onClick={(event) => {
                        event.stopPropagation()
                        moveInUserOrder(item.fieldId as string, 'down')
                      }}
                      disabled={
                        (userOrderIndexMap.get(item.fieldId) ?? userOrder.length - 1) >=
                        userOrder.length - 1
                      }
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-white/15 text-slate-200 disabled:opacity-40"
                    >
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : copiedItemId === item.id ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-200" />
                ) : (
                  <Copy
                    className={`h-3 w-3 shrink-0 ${
                      failedItemId === item.id ? 'text-rose-200' : 'text-cyan-200/85'
                    }`}
                  />
                )}
              </button>
            </li>
          ))}
          {!topResults.length && (
            <li className="col-span-2 rounded-md border border-white/10 bg-slate-900/40 px-2 py-1.5 text-[11px] text-slate-300">
              No matching details found.
              <button
                type="button"
                onClick={openVaultSettings}
                className="ml-1 inline text-cyan-200 underline decoration-cyan-300/60 underline-offset-2"
              >
                Add or edit details
              </button>
            </li>
          )}
        </ul>
      </section>
    </main>
  )
}
