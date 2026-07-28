import { useState } from 'react'
import { X } from 'lucide-react'
import { ICON_REGISTRY, getIconEntry, getIconLabel, iconMatchesSearch } from './icon-map'

interface IconPickerProps {
  value: string | undefined
  onChange: (iconId: string | undefined) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? ICON_REGISTRY.filter((entry) => iconMatchesSearch(entry, search))
    : ICON_REGISTRY

  const selected = value ? getIconEntry(value) : undefined

  const close = () => {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-950 px-2 text-xs text-zinc-200 transition-all duration-200 hover:border-white/[0.12]"
      >
        {selected ? (
          <>
            <selected.component className="h-3.5 w-3.5" />
            <span>{getIconLabel(selected)}</span>
          </>
        ) : (
          <span className="text-zinc-500">Pick icon</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 shadow-lg">
            <div className="flex flex-col space-y-1.5 border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold leading-none tracking-tight text-white">
                  Choose Icon
                </h3>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close icon picker"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-400">Select an icon for your field.</p>
            </div>

            <div className="px-5 py-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                autoFocus
                className="mb-4 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />

              <div className="grid max-h-60 grid-cols-7 gap-1.5 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined)
                    close()
                  }}
                  title="No icon"
                  className={`flex h-9 w-full items-center justify-center rounded-md text-xs transition-colors ${
                    !value
                      ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  ∅
                </button>
                {filtered.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      onChange(entry.id)
                      close()
                    }}
                    title={getIconLabel(entry)}
                    className={`flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                      value === entry.id
                        ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    <entry.component className="h-4 w-4" />
                  </button>
                ))}
              </div>

              {!filtered.length && (
                <p className="py-4 text-center text-sm text-zinc-500">
                  No icons match your search.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-800 px-5 py-3">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
