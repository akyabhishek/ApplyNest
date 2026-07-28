import type { FieldSuggestion, InsertValueResult, SearchResultItem } from '../shared/types'

type Candidate = {
  elementId: string
  hint: string
}

const INPUT_SELECTOR = 'input:not([type="hidden"]):not([type="submit"]), textarea, select'
const ELEMENT_ID_ATTR = 'data-applynest-id'
const CHIP_ATTR = 'data-applynest-chip-for'

let mounted = false
let lastFocusedElementId: string | null = null

type RuntimeMessage = {
  type: string
  payload?: unknown
}

const hasRuntime = () => typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage)

async function sendRuntimeMessage<TResponse>(message: RuntimeMessage): Promise<TResponse> {
  if (!hasRuntime()) {
    throw new Error('Chrome runtime is not available in this context')
  }

  return chrome.runtime.sendMessage(message) as Promise<TResponse>
}

function canMountOnCurrentPage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const protocol = window.location?.protocol ?? ''
  return protocol === 'http:' || protocol === 'https:'
}

function escapeAttributeValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function ensureStyles() {
  if (document.getElementById('applynest-inline-style')) return

  const style = document.createElement('style')
  style.id = 'applynest-inline-style'
  style.textContent = `
    .applynest-fab {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483640;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(99, 102, 241, 0.25);
      background: linear-gradient(140deg, #4f46e5, #6366f1);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .applynest-fab img {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      object-fit: cover;
    }

    .applynest-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 32px rgba(99, 102, 241, 0.25);
    }

    .applynest-fab:active {
      transform: scale(0.95);
    }

    .applynest-panel {
      position: fixed;
      right: 20px;
      bottom: 72px;
      width: 320px;
      max-height: 440px;
      overflow-x: hidden;
      overflow-y: auto;
      z-index: 2147483640;
      border-radius: 12px;
      border: 1px solid rgba(63, 63, 70, 0.6);
      background: rgba(9, 9, 11, 0.96);
      backdrop-filter: blur(12px);
      color: #fafafa;
      font-family: 'Sora', 'Manrope', system-ui, -apple-system, sans-serif;
      display: none;
      padding: 14px;
      box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.5);
    }

    .applynest-panel.open {
      display: block;
    }

    .applynest-panel input {
      width: 100%;
      border-radius: 8px;
      border: 1px solid rgba(63, 63, 70, 0.6);
      background: #18181b;
      color: #fafafa;
      padding: 9px 12px;
      margin-bottom: 10px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .applynest-panel input:focus {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    .applynest-panel input::placeholder {
      color: #71717a;
    }

    .applynest-item {
      width: 100%;
      border-radius: 8px;
      border: 1px solid rgba(63, 63, 70, 0.4);
      background: #18181b;
      color: #fafafa;
      cursor: pointer;
      padding: 10px 12px;
      margin-bottom: 6px;
      text-align: left;
      font-size: 13px;
      transition: background 0.15s, border-color 0.15s;
    }

    .applynest-item:hover {
      background: #27272a;
      border-color: rgba(63, 63, 70, 0.8);
    }

    .applynest-item:active {
      transform: scale(0.99);
    }

    .applynest-item.copied {
      border-color: rgba(34, 197, 94, 0.4);
      background: rgba(34, 197, 94, 0.08);
    }

    .applynest-item.copied strong {
      color: #4ade80;
    }

    .applynest-item.copied small {
      color: #4ade80;
    }

    .applynest-item strong {
      color: #e4e4e7;
      font-weight: 600;
    }

    .applynest-item small {
      color: #a1a1aa;
      font-size: 11px;
    }

    .applynest-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      margin-left: 6px;
      border-radius: 999px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.08);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 10px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .applynest-chip:hover {
      background: rgba(99, 102, 241, 0.18);
      border-color: rgba(99, 102, 241, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
    }

    .applynest-chip:active {
      transform: translateY(0);
    }

    .applynest-chip.low {
      border-color: rgba(245, 158, 11, 0.3);
      background: rgba(245, 158, 11, 0.08);
      color: #fbbf24;
    }

    .applynest-chip.low:hover {
      background: rgba(245, 158, 11, 0.18);
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }
  `

  document.documentElement.appendChild(style)
}

function getElementHint(element: Element): string {
  const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const id = input.id
  let labelFromFor = ''

  if (id) {
    try {
      const safeId = escapeAttributeValue(id)
      labelFromFor = document.querySelector(`label[for="${safeId}"]`)?.textContent ?? ''
    } catch {
      labelFromFor = ''
    }
  }

  const ariaLabel = input.getAttribute('aria-label') ?? ''
  const placeholder = 'placeholder' in input ? (input.placeholder ?? '') : ''
  const name = input.getAttribute('name') ?? ''

  return [labelFromFor, ariaLabel, placeholder, name, id].join(' ').trim().toLowerCase()
}

function fieldElements(): HTMLElement[] {
  return [...document.querySelectorAll(INPUT_SELECTOR)].filter(
    (element) => element instanceof HTMLElement && !element.hasAttribute('disabled')
  ) as HTMLElement[]
}

function ensureElementId(element: HTMLElement) {
  if (!element.getAttribute(ELEMENT_ID_ATTR)) {
    element.setAttribute(ELEMENT_ID_ATTR, crypto.randomUUID())
  }
  return element.getAttribute(ELEMENT_ID_ATTR)!
}

function isFillableElement(element: Element | null): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.matches(INPUT_SELECTOR) &&
    !element.hasAttribute('disabled')
  )
}

function collectCandidates(): Candidate[] {
  return fieldElements()
    .map((element) => {
      try {
        return {
          elementId: ensureElementId(element),
          hint: getElementHint(element)
        }
      } catch {
        return null
      }
    })
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .filter((candidate) => candidate.hint.length > 0)
}

function fillElement(element: HTMLElement, value: string) {
  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) {
      return false
    }

    const blockedTypes = new Set(['file', 'checkbox', 'radio', 'button', 'submit', 'reset'])
    if (blockedTypes.has(element.type)) {
      return false
    }

    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false
    }

    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  if (element instanceof HTMLSelectElement) {
    if (element.disabled) {
      return false
    }

    const option = [...element.options].find(
      (entry) =>
        entry.value.toLowerCase() === value.toLowerCase() ||
        entry.text.toLowerCase() === value.toLowerCase()
    )
    if (!option) {
      return false
    }

    element.value = option.value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  return false
}

function resolveInsertTarget(): HTMLElement | null {
  const activeElement = document.activeElement
  if (isFillableElement(activeElement)) {
    ensureElementId(activeElement)
    return activeElement
  }

  if (!lastFocusedElementId) {
    return null
  }

  const fallback = document.querySelector(
    `[${ELEMENT_ID_ATTR}="${escapeAttributeValue(lastFocusedElementId)}"]`
  )

  return isFillableElement(fallback) ? fallback : null
}

function insertIntoFocusedField(value: string): InsertValueResult {
  const target = resolveInsertTarget()
  if (!target) {
    return { ok: false, reason: 'NO_TARGET' }
  }

  try {
    const inserted = fillElement(target, value)
    if (!inserted) {
      return { ok: false, reason: 'NO_TARGET' }
    }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'NO_TARGET' }
  }
}

function upsertSuggestionChip(suggestion: FieldSuggestion) {
  const element = document.querySelector(
    `[${ELEMENT_ID_ATTR}="${suggestion.elementId}"]`
  ) as HTMLElement | null

  if (!element || !element.parentElement) return

  const chipId = `${CHIP_ATTR}-${suggestion.elementId}`
  const existing = element.parentElement.querySelector(
    `[id="${chipId}"]`
  ) as HTMLButtonElement | null

  if (existing) {
    existing.textContent = `ApplyNest \u00b7 ${suggestion.label}`
    existing.className = `applynest-chip ${suggestion.confidence === 'low' ? 'low' : ''}`.trim()
    return
  }

  const chip = document.createElement('button')
  chip.id = chipId
  chip.setAttribute(CHIP_ATTR, suggestion.elementId)
  chip.type = 'button'
  chip.className = `applynest-chip ${suggestion.confidence === 'low' ? 'low' : ''}`.trim()
  chip.textContent = `ApplyNest · ${suggestion.label}`

  chip.addEventListener('click', () => {
    fillElement(element, suggestion.value)
  })

  element.insertAdjacentElement('afterend', chip)
}

async function runSmartDetection() {
  const candidates = collectCandidates()
  if (!candidates.length) return

  try {
    const suggestions = await sendRuntimeMessage<FieldSuggestion[]>({
      type: 'FORM_DETECTED',
      payload: { candidates }
    })

    suggestions.forEach(upsertSuggestionChip)
  } catch (error) {
    console.debug('ApplyNest detector skipped', error)
  }
}

async function searchFromPanel(query: string) {
  const results = await sendRuntimeMessage<SearchResultItem[]>({
    type: 'SEARCH_ITEMS',
    payload: { query }
  })

  return results
}

function mountFloatingWidget() {
  if (document.getElementById('applynest-fab')) return

  const fab = document.createElement('button')
  fab.id = 'applynest-fab'
  fab.className = 'applynest-fab'
  fab.type = 'button'

  const fabIcon = document.createElement('img')
  fabIcon.src = chrome.runtime.getURL('logo.png')
  fabIcon.alt = 'ApplyNest'
  fab.appendChild(fabIcon)

  const panel = document.createElement('section')
  panel.id = 'applynest-panel'
  panel.className = 'applynest-panel'

  const search = document.createElement('input')
  search.placeholder = 'Search vault values...'

  const resultRoot = document.createElement('div')

  async function refresh(query: string) {
    try {
      const results = await searchFromPanel(query)
      resultRoot.innerHTML = ''

      results.forEach((item) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'applynest-item'
        const title = document.createElement('strong')
        title.textContent = item.label
        button.append(title)
        button.addEventListener('click', async () => {
          const insertResult = insertIntoFocusedField(item.value)

          if (insertResult.ok) {
            button.classList.add('copied')
            title.textContent = '✓ Inserted'
            setTimeout(() => {
              button.classList.remove('copied')
              title.textContent = item.label
            }, 1200)
            return
          }

          try {
            await navigator.clipboard.writeText(item.value)
            button.classList.add('copied')
            title.textContent = '✓ Copied'
            setTimeout(() => {
              button.classList.remove('copied')
              title.textContent = item.label
            }, 1200)
          } catch (error) {
            console.debug('ApplyNest clipboard write failed', error)
          }
        })
        resultRoot.appendChild(button)
      })
    } catch (error) {
      resultRoot.innerHTML = '<p>Unable to load results right now.</p>'
      console.debug('ApplyNest panel search failed', error)
    }
  }

  search.addEventListener('input', (event) => {
    const query = (event.target as HTMLInputElement).value
    void refresh(query)
  })

  fab.addEventListener('click', () => {
    panel.classList.toggle('open')
    if (panel.classList.contains('open')) {
      void refresh(search.value)
    }
  })

  panel.append(search, resultRoot)
  document.documentElement.append(fab, panel)
}

function mount() {
  if (mounted) return
  if (!canMountOnCurrentPage()) return
  mounted = true

  ensureStyles()
  mountFloatingWidget()
  void runSmartDetection()

  document.addEventListener('focusin', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (!isFillableElement(target)) return

    lastFocusedElementId = ensureElementId(target)
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'INSERT_VALUE_IN_FOCUSED_FIELD') {
      return
    }

    const value =
      message.payload && typeof message.payload.value === 'string' ? message.payload.value : ''

    const result = insertIntoFocusedField(value)
    sendResponse(result)
    return true
  })

  if (!document.body) {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        void runSmartDetection()
      },
      { once: true }
    )
    return
  }

  const observer = new MutationObserver(() => {
    void runSmartDetection()
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

try {
  mount()
} catch (error) {
  console.debug('ApplyNest content mount failed', error)
}
