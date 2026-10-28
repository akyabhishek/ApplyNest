import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  PlusCircle,
  RefreshCw,
  Search
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getIconEntry } from '../shared/icon-map'
import { sendRuntimeMessage } from '../shared/messaging'
import type { SearchResultItem } from '../shared/types'

type SortOption = 'relevance' | 'label_asc' | 'label_desc' | 'category' | 'user_order'

const SORT_STORAGE_KEY = 'applynest_sidepanel_sort'
const USER_ORDER_STORAGE_KEY = 'applynest_sidepanel_user_order'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const sidePanelShortcut = isMac ? 'Option+J' : 'Alt+J'

const isSortOption = (value: string): value is SortOption => {
  return (
    value === 'relevance' ||
    value === 'label_asc' ||
    value === 'label_desc' ||
    value === 'category' ||
    value === 'user_order'
  )
}

const getInitialSortBy = (): SortOption => {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY)
    if (saved && isSortOption(saved)) {
      return saved
    }
  } catch {
    // Ignore localStorage failures in restricted extension contexts.
  }

  return 'relevance'
}

const getInitialUserOrder = (): string[] => {
  try {
    const savedOrder = localStorage.getItem(USER_ORDER_STORAGE_KEY)
    if (!savedOrder) return []

    const parsed = JSON.parse(savedOrder) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    // Ignore invalid stored order payloads.
    return []
  }
}

const mergeUserOrderWithActiveFields = (order: string[], activeFieldIds: string[]) => {
  if (!activeFieldIds.length) return order

  const kept = order.filter((fieldId) => activeFieldIds.includes(fieldId))
  const missing = activeFieldIds.filter((fieldId) => !kept.includes(fieldId))
  return [...kept, ...missing]
}

export function SidepanelApp() {
  const [query, setQuery] = useState('')
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [failedItemId, setFailedItemId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fields' | 'templates'>('fields')
  const [sortBy, setSortBy] = useState<SortOption>(getInitialSortBy)
  const [arrangeMode, setArrangeMode] = useState(false)
  const [userOrder, setUserOrder] = useState<string[]>(getInitialUserOrder)
  const [addSiteStatus, setAddSiteStatus] = useState<'idle' | 'added' | 'exists' | 'error'>('idle')
  const queryClient = useQueryClient()

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

  const {
    data: results = [],
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['sidepanel-default-results', query],
    queryFn: () =>
      sendRuntimeMessage<SearchResultItem[]>({
        type: 'SEARCH_ITEMS',
        payload: { query }
      })
  })

  const activeFieldIds = useMemo(
    () => results.filter((item) => Boolean(item.fieldId)).map((item) => item.fieldId as string),
    [results]
  )

  const effectiveUserOrder = useMemo(
    () => mergeUserOrderWithActiveFields(userOrder, activeFieldIds),
    [userOrder, activeFieldIds]
  )

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
      const orderMap = new Map(effectiveUserOrder.map((fieldId, index) => [fieldId, index]))

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

    return sorted
  }, [results, sortBy, effectiveUserOrder, activeTab])

  const userOrderIndexMap = useMemo(
    () => new Map(effectiveUserOrder.map((fieldId, index) => [fieldId, index])),
    [effectiveUserOrder]
  )

  const moveInUserOrder = (fieldId: string, direction: 'up' | 'down') => {
    setUserOrder((prev) => {
      const normalizedOrder = mergeUserOrderWithActiveFields(prev, activeFieldIds)
      const currentIndex = normalizedOrder.indexOf(fieldId)
      if (currentIndex === -1) return prev

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= normalizedOrder.length) return prev

      const next = [...normalizedOrder]
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

      // Try inserting directly into the active tab's focused field
      let inserted = false
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'INSERT_VALUE_IN_FOCUSED_FIELD',
            payload: { value: item.value }
          })
          inserted = response?.ok === true
        }
      } catch {
        // Content script not available on this tab, fall through to clipboard
      }

      if (!inserted) {
        await navigator.clipboard.writeText(item.value)
      }

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

  const addCurrentSite = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url) {
        setAddSiteStatus('error')
        return
      }
      const hostname = new URL(tab.url).hostname
      if (!hostname) {
        setAddSiteStatus('error')
        return
      }

      const current = await sendRuntimeMessage<string[]>({ type: 'GET_CUSTOM_SITES' })
      if (current.includes(hostname)) {
        setAddSiteStatus('exists')
      } else {
        await sendRuntimeMessage({
          type: 'SET_CUSTOM_SITES',
          payload: { sites: [...current, hostname] }
        })
        setAddSiteStatus('added')
      }
    } catch {
      setAddSiteStatus('error')
    }
    window.setTimeout(() => setAddSiteStatus('idle'), 2000)
  }

  return (
    <main className="min-h-screen p-1.5 text-white sm:p-2">
      <section className="applynest-glass rounded-xl p-2">
        <header className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="ApplyNest logo" className="h-6 w-6 rounded-md object-cover" />
            <h1 className="text-xs font-semibold tracking-tight text-zinc-100">ApplyNest</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                void refetch()
              }}
              disabled={isFetching}
              aria-label="Refresh data"
              title="Refresh data"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-zinc-900 text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={openVaultSettings}
              aria-label="Add or edit details"
              title="Add or edit details"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300 transition-all duration-200 hover:bg-indigo-500/25"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="mb-1 inline-flex rounded-md border border-white/[0.06] bg-zinc-950/50 p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('fields')
            }}
            className={`rounded px-2 py-1 text-[10px] font-semibold transition-all duration-200 ${
              activeTab === 'fields'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
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
            className={`rounded px-2 py-1 text-[10px] font-semibold transition-all duration-200 ${
              activeTab === 'templates'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Templates
          </button>
        </div>

        <div className="mt-1 flex items-center gap-1">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search details"
              className="h-7 w-full rounded-md border border-white/[0.08] bg-zinc-950 py-1 pl-6 pr-2 text-[11px] outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
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
            className="h-7 rounded-md border border-white/[0.08] bg-zinc-950 px-1.5 text-[10px] text-zinc-300 outline-none transition-all duration-200 focus:border-indigo-400"
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
              className="h-6 rounded-md bg-indigo-500/15 px-2 text-[10px] font-medium text-indigo-300 transition-all duration-200 hover:bg-indigo-500/25"
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
                className={`flex h-11 w-full items-center justify-between gap-1 rounded-md border px-1.5 text-left transition-all duration-200 ${
                  copiedItemId === item.id
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : failedItemId === item.id
                      ? 'border-rose-400/40 bg-rose-500/10'
                      : 'border-white/[0.06] bg-zinc-900/50 hover:border-white/[0.12] hover:bg-zinc-900/80'
                }`}
              >
                <span className="flex min-w-0 items-center gap-1">
                  {item.icon &&
                    (() => {
                      const entry = getIconEntry(item.icon)
                      if (!entry) return null
                      const Icon = entry.component
                      return <Icon className="h-3 w-3 shrink-0 text-indigo-400" />
                    })()}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold leading-none text-zinc-100">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] leading-none text-zinc-400">
                      {item.value}
                    </span>
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
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-white/[0.08] text-zinc-300 disabled:opacity-40"
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
                        (userOrderIndexMap.get(item.fieldId) ?? effectiveUserOrder.length - 1) >=
                        effectiveUserOrder.length - 1
                      }
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-white/[0.08] text-zinc-300 disabled:opacity-40"
                    >
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : copiedItemId === item.id ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                ) : (
                  <Copy
                    className={`h-3 w-3 shrink-0 ${
                      failedItemId === item.id ? 'text-rose-400' : 'text-zinc-500'
                    }`}
                  />
                )}
              </button>
            </li>
          ))}
          {!topResults.length && (
            <li className="col-span-2 rounded-md border border-white/[0.06] bg-zinc-900/40 px-2 py-1.5 text-[11px] text-zinc-400">
              No matching details found.
              <button
                type="button"
                onClick={openVaultSettings}
                className="ml-1 inline text-indigo-400 underline decoration-indigo-400/40 underline-offset-2"
              >
                Add or edit details
              </button>
            </li>
          )}
        </ul>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[9px] text-zinc-600">
            Open panel:{' '}
            <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-zinc-500">
              {sidePanelShortcut}
            </kbd>
          </p>
          <button
            type="button"
            onClick={() => void addCurrentSite()}
            className={`flex items-center gap-1 text-[9px] transition-colors ${
              addSiteStatus === 'added'
                ? 'text-emerald-400'
                : addSiteStatus === 'exists'
                  ? 'text-amber-400'
                  : addSiteStatus === 'error'
                    ? 'text-rose-400'
                    : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Globe className="h-2.5 w-2.5" />
            {addSiteStatus === 'added'
              ? 'Site added!'
              : addSiteStatus === 'exists'
                ? 'Already added'
                : addSiteStatus === 'error'
                  ? 'Could not detect'
                  : 'Add site to quick panel'}
          </button>
        </div>
      </section>
    </main>
  )
}
