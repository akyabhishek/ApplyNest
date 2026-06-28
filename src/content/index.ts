import { sendRuntimeMessage } from '../shared/messaging'
import type { FieldSuggestion, SearchResultItem } from '../shared/types'

type Candidate = {
  elementId: string
  hint: string
}

const INPUT_SELECTOR = 'input:not([type="hidden"]):not([type="submit"]), textarea, select'
const ELEMENT_ID_ATTR = 'data-applynest-id'
const CHIP_ATTR = 'data-applynest-chip-for'

let mounted = false

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
      border: 1px solid rgba(255,255,255,0.3);
      background: linear-gradient(140deg, #0f766e, #164e63);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 14px 30px rgba(0,0,0,0.22);
    }

    .applynest-panel {
      position: fixed;
      right: 20px;
      bottom: 72px;
      width: 320px;
      max-height: 440px;
      overflow: auto;
      z-index: 2147483640;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(14, 30, 40, 0.95);
      backdrop-filter: blur(8px);
      color: #fff;
      font-family: Segoe UI, sans-serif;
      display: none;
      padding: 12px;
    }

    .applynest-panel.open {
      display: block;
    }

    .applynest-panel input {
      width: 100%;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(12, 20, 28, 0.8);
      color: #fff;
      padding: 8px 10px;
      margin-bottom: 8px;
    }

    .applynest-item {
      width: 100%;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(10, 18, 24, 0.8);
      color: #fff;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 6px;
      text-align: left;
    }

    .applynest-chip {
      margin-top: 4px;
      margin-left: 6px;
      border-radius: 999px;
      border: 1px solid rgba(15, 118, 110, 0.6);
      background: rgba(15, 118, 110, 0.18);
      color: #0f766e;
      font-size: 11px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .applynest-chip.low {
      border-color: rgba(245, 158, 11, 0.6);
      background: rgba(245, 158, 11, 0.18);
      color: #a16207;
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
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = value
  } else if (element instanceof HTMLSelectElement) {
    const option = [...element.options].find(
      (entry) =>
        entry.value.toLowerCase() === value.toLowerCase() ||
        entry.text.toLowerCase() === value.toLowerCase()
    )
    if (option) {
      element.value = option.value
    }
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
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
    existing.textContent = `Use ${suggestion.label}`
    existing.className = `applynest-chip ${suggestion.confidence === 'low' ? 'low' : ''}`.trim()
    return
  }

  const chip = document.createElement('button')
  chip.id = chipId
  chip.setAttribute(CHIP_ATTR, suggestion.elementId)
  chip.type = 'button'
  chip.textContent = `Use ${suggestion.label}`
  chip.className = `applynest-chip ${suggestion.confidence === 'low' ? 'low' : ''}`.trim()

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

  return results.slice(0, 6)
}

function mountFloatingWidget() {
  if (document.getElementById('applynest-fab')) return

  const fab = document.createElement('button')
  fab.id = 'applynest-fab'
  fab.className = 'applynest-fab'
  fab.type = 'button'
  fab.textContent = 'AN'

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
        const lineBreak = document.createElement('br')
        const preview = document.createElement('small')
        preview.textContent = item.value
        button.append(title, lineBreak, preview)
        button.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(item.value)
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
