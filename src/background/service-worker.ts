import {
  addField,
  clearAllFields,
  ensureState,
  getRecent,
  getState,
  mapCandidates,
  removeField,
  recordCopy,
  searchAll,
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
      payload: { label: string; key: string; value: string; category: FieldCategory }
    }
  | {
      type: 'UPDATE_FIELD'
      payload: { id: string; label: string; key: string; value: string; category: FieldCategory }
    }
  | { type: 'REMOVE_FIELD'; payload: { id: string } }
  | { type: 'CLEAR_ALL_FIELDS' }
  | { type: 'IMPORT_STATE'; payload: { state: ApplyNestState } }
  | { type: 'FORM_DETECTED'; payload: { candidates: DetectedFieldCandidate[] } }
  | { type: 'TOGGLE_SIDE_PANEL' }

chrome.runtime.onInstalled.addListener(async () => {
  await ensureState()

  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  }
})

async function openPanelForTab(tabId: number) {
  if (!chrome.sidePanel?.open) return

  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: true
  })
  await chrome.sidePanel.open({ tabId })
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await openPanelForTab(tab.id)
})

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-side-panel' && tab?.id) {
    await openPanelForTab(tab.id)
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
