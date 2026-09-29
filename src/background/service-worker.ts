import {
  addField,
  clearAllFields,
  ensureState,
  getCustomSites,
  getEnableEverywhere,
  getRecent,
  getState,
  mapCandidates,
  removeField,
  recordCopy,
  reorderFields,
  searchAll,
  setCustomSites,
  setEnableEverywhere,
  setState,
  updateField
} from '../shared/storage'
import type { ApplyNestState, DetectedFieldCandidate, FieldCategory } from '../shared/types'

type RequestMessage =
  | { type: 'SEARCH_ITEMS'; payload: { query: string } }
  | { type: 'COPY_FIELD'; payload: { fieldId: string } }
  | { type: 'GET_STATE' }
  | { type: 'GET_RECENT' }
  | {
      type: 'ADD_FIELD'
      payload: { label: string; key: string; value: string; category: FieldCategory; icon?: string }
    }
  | {
      type: 'UPDATE_FIELD'
      payload: {
        id: string
        label: string
        key: string
        value: string
        category: FieldCategory
        icon?: string
      }
    }
  | { type: 'REMOVE_FIELD'; payload: { id: string } }
  | { type: 'CLEAR_ALL_FIELDS' }
  | { type: 'IMPORT_STATE'; payload: { state: ApplyNestState } }
  | { type: 'FORM_DETECTED'; payload: { candidates: DetectedFieldCandidate[] } }
  | { type: 'TOGGLE_SIDE_PANEL' }
  | { type: 'GET_CUSTOM_SITES' }
  | { type: 'SET_CUSTOM_SITES'; payload: { sites: string[] } }
  | { type: 'REORDER_FIELDS'; payload: { orderedIds: string[] } }
  | { type: 'GET_ENABLE_EVERYWHERE' }
  | { type: 'SET_ENABLE_EVERYWHERE'; payload: { enabled: boolean } }

const DYNAMIC_SCRIPT_ID = 'applynest-custom-sites'
const EVERYWHERE_SCRIPT_ID = 'applynest-everywhere'

async function registerEverywhereScript() {
  const enabled = await getEnableEverywhere()

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [EVERYWHERE_SCRIPT_ID] })
  } catch {
    // Script not registered yet, ignore
  }

  if (!enabled) return

  await chrome.scripting.registerContentScripts([
    {
      id: EVERYWHERE_SCRIPT_ID,
      matches: ['<all_urls>'],
      js: ['assets/content.js'],
      runAt: 'document_idle'
    }
  ])
}

async function registerCustomSiteScripts() {
  const sites = await getCustomSites()

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] })
  } catch {
    // Script not registered yet, ignore
  }

  if (!sites.length) return

  const patterns = sites.map((site) => {
    const cleaned = site.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    return `*://*.${cleaned}/*`
  })

  await chrome.scripting.registerContentScripts([
    {
      id: DYNAMIC_SCRIPT_ID,
      matches: patterns,
      js: ['assets/content.js'],
      runAt: 'document_idle'
    }
  ])
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureState()
  await registerCustomSiteScripts()
  await registerEverywhereScript()

  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  }
})

// Resets on service-worker restart; first press after restart will always open
const panelOpenTabs = new Set<number>()

async function openPanelForTab(tabId: number) {
  if (!chrome.sidePanel?.open) return
  await chrome.sidePanel.open({ tabId })
  panelOpenTabs.add(tabId)
}

async function togglePanelForTab(tabId: number) {
  if (!chrome.sidePanel?.open) return
  if (panelOpenTabs.has(tabId)) {
    try {
      await (chrome.sidePanel as unknown as { close(o: { tabId: number }): Promise<void> }).close({
        tabId
      })
    } catch {
      // Already closed by user
    }
    panelOpenTabs.delete(tabId)
  } else {
    await chrome.sidePanel.open({ tabId })
    panelOpenTabs.add(tabId)
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  panelOpenTabs.delete(tabId)
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await openPanelForTab(tab.id)
})

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-side-panel' && tab?.id) {
    await togglePanelForTab(tab.id)
  }
})

chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
  ;(async () => {
    switch (message.type) {
      case 'SEARCH_ITEMS': {
        const data = await searchAll(message.payload.query)
        sendResponse(data)
        break
      }
      case 'COPY_FIELD': {
        const value = await recordCopy(message.payload.fieldId)
        sendResponse({ value })
        break
      }
      case 'GET_RECENT': {
        const data = await getRecent()
        sendResponse(data)
        break
      }
      case 'GET_STATE': {
        const state = await getState()
        sendResponse(state)
        break
      }
      case 'ADD_FIELD': {
        const data = await addField(message.payload)
        sendResponse(data)
        break
      }
      case 'UPDATE_FIELD': {
        const data = await updateField(message.payload)
        sendResponse(data)
        break
      }
      case 'REMOVE_FIELD': {
        const data = await removeField(message.payload.id)
        sendResponse(data)
        break
      }
      case 'CLEAR_ALL_FIELDS': {
        const data = await clearAllFields()
        sendResponse(data)
        break
      }
      case 'IMPORT_STATE': {
        await setState(message.payload.state)
        const data = await getState()
        sendResponse(data)
        break
      }
      case 'FORM_DETECTED': {
        const suggestions = await mapCandidates(message.payload.candidates)
        sendResponse(suggestions)
        break
      }
      case 'TOGGLE_SIDE_PANEL': {
        if (sender.tab?.id) {
          await openPanelForTab(sender.tab.id)
        }
        sendResponse({ ok: true })
        break
      }
      case 'GET_CUSTOM_SITES': {
        const sites = await getCustomSites()
        sendResponse(sites)
        break
      }
      case 'SET_CUSTOM_SITES': {
        await setCustomSites(message.payload.sites)
        await registerCustomSiteScripts()
        sendResponse({ ok: true })
        break
      }
      case 'REORDER_FIELDS': {
        const result = await reorderFields(message.payload.orderedIds)
        sendResponse(result)
        break
      }
      case 'GET_ENABLE_EVERYWHERE': {
        const enabled = await getEnableEverywhere()
        sendResponse({ enabled })
        break
      }
      case 'SET_ENABLE_EVERYWHERE': {
        await setEnableEverywhere(message.payload.enabled)
        await registerEverywhereScript()
        sendResponse({ ok: true })
        break
      }
      default: {
        sendResponse({ ok: false })
      }
    }
  })().catch((error) => {
    console.error('ApplyNest service worker error:', error)
    sendResponse({ error: 'Unexpected background error' })
  })

  return true
})
