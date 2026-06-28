import { DEFAULT_STATE } from './default-data'
import type {
  ApplyNestState,
  DetectedFieldCandidate,
  FieldSuggestion,
  SearchResultItem,
  VaultField
} from './types'

const STORAGE_KEY = 'applynest_state_v1'

const toDefaultKey = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'custom_field'
}

const hasChromeStorage = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

const scoreMatch = (query: string, text: string) => {
  if (!query) return 0
  const normalizedQuery = query.toLowerCase().trim()
  const normalizedText = text.toLowerCase()

  if (normalizedText === normalizedQuery) return 100
  if (normalizedText.startsWith(normalizedQuery)) return 70
  if (normalizedText.includes(normalizedQuery)) return 50
  return 0
}

const fieldScore = (query: string, field: VaultField) => {
  const base = Math.max(
    scoreMatch(query, field.label),
    scoreMatch(query, field.key),
    scoreMatch(query, field.value)
  )

  const alias = field.aliases.reduce(
    (max, aliasValue) => Math.max(max, scoreMatch(query, aliasValue)),
    0
  )

  return Math.max(base, alias)
}

export async function getState(): Promise<ApplyNestState> {
  if (hasChromeStorage()) {
    const stored = await chrome.storage.local.get(STORAGE_KEY)
    const state = stored[STORAGE_KEY] as ApplyNestState | undefined
    return state ?? DEFAULT_STATE
  }

  const fallback = localStorage.getItem(STORAGE_KEY)
  if (!fallback) {
    return DEFAULT_STATE
  }

  return JSON.parse(fallback) as ApplyNestState
}

export async function setState(state: ApplyNestState): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state })
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export async function ensureState(): Promise<ApplyNestState> {
  const state = await getState()
  if (!state.fields.length) {
    await setState(DEFAULT_STATE)
    return DEFAULT_STATE
  }
  return state
}

export async function addField(
  newField: Omit<VaultField, 'id' | 'aliases'>
): Promise<ApplyNestState> {
  const state = await getState()
  const resolvedKey = newField.key.trim() ? newField.key.trim() : toDefaultKey(newField.label)

  const field: VaultField = {
    ...newField,
    key: resolvedKey,
    id: crypto.randomUUID(),
    aliases: [newField.label.toLowerCase()]
  }

  const nextState = { ...state, fields: [field, ...state.fields] }
  await setState(nextState)
  return nextState
}

export async function updateField(
  updatedField: Pick<VaultField, 'id' | 'label' | 'key' | 'value' | 'category'>
): Promise<ApplyNestState> {
  const state = await getState()
  const resolvedKey = updatedField.key.trim()
    ? updatedField.key.trim()
    : toDefaultKey(updatedField.label)

  const nextFields = state.fields.map((field) => {
    if (field.id !== updatedField.id) {
      return field
    }

    return {
      ...field,
      label: updatedField.label,
      key: resolvedKey,
      value: updatedField.value,
      category: updatedField.category,
      aliases: Array.from(new Set([updatedField.label.toLowerCase(), ...field.aliases]))
    }
  })

  const nextState = { ...state, fields: nextFields }
  await setState(nextState)
  return nextState
}

export async function removeField(fieldId: string): Promise<ApplyNestState> {
  const state = await getState()

  const nextState: ApplyNestState = {
    ...state,
    fields: state.fields.filter((field) => field.id !== fieldId),
    recent: state.recent.filter((item) => item.fieldId !== fieldId)
  }

  await setState(nextState)
  return nextState
}

export async function clearAllFields(): Promise<ApplyNestState> {
  const state = await getState()

  const nextState: ApplyNestState = {
    ...state,
    fields: [],
    recent: []
  }

  await setState(nextState)
  return nextState
}

export async function searchAll(query: string): Promise<SearchResultItem[]> {
  const state = await getState()
  const normalized = query.trim().toLowerCase()

  const fieldResults = state.fields
    .map((field) => ({
      id: `field:${field.id}`,
      label: field.label,
      value: field.value,
      category: field.category,
      fieldId: field.id,
      score: normalized ? fieldScore(normalized, field) : 10
    }))
    .filter((item) => item.score > 0)

  const templateResults = state.templates
    .map((template) => ({
      id: `template:${template.id}`,
      label: template.name,
      value: template.content,
      category: 'template' as const,
      score: normalized
        ? Math.max(scoreMatch(normalized, template.name), scoreMatch(normalized, template.content))
        : 4
    }))
    .filter((item) => item.score > 0)

  return [...fieldResults, ...templateResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((item) => {
      const base = {
        id: item.id,
        label: item.label,
        value: item.value,
        category: item.category
      }

      if ('fieldId' in item) {
        return { ...base, fieldId: item.fieldId }
      }

      return base
    })
}

export async function recordCopy(fieldId: string): Promise<string | null> {
  const state = await getState()
  const field = state.fields.find((item) => item.id === fieldId)
  if (!field) return null

  const recentItem = {
    id: crypto.randomUUID(),
    fieldId: field.id,
    label: field.label,
    value: field.value,
    copiedAt: new Date().toISOString()
  }

  const nextState = {
    ...state,
    recent: [recentItem, ...state.recent].slice(0, 30)
  }

  await setState(nextState)
  return field.value
}

export async function getRecent() {
  const state = await getState()
  return state.recent
}

const resolveBestField = (hint: string, fields: VaultField[]) => {
  const normalized = hint.toLowerCase()
  let bestField: VaultField | null = null
  let bestScore = 0

  for (const field of fields) {
    const score = fieldScore(normalized, field)
    if (score > bestScore) {
      bestScore = score
      bestField = field
    }
  }

  if (!bestField || bestScore < 40) {
    return null
  }

  const confidence = bestScore >= 70 ? 'high' : bestScore >= 50 ? 'medium' : 'low'

  return {
    field: bestField,
    confidence
  }
}

export async function mapCandidates(
  candidates: DetectedFieldCandidate[]
): Promise<FieldSuggestion[]> {
  const state = await getState()

  return candidates
    .map((candidate) => {
      const match = resolveBestField(candidate.hint, state.fields)
      if (!match) return null

      return {
        elementId: candidate.elementId,
        fieldId: match.field.id,
        label: match.field.label,
        value: match.field.value,
        confidence: match.confidence
      } as FieldSuggestion
    })
    .filter((item): item is FieldSuggestion => Boolean(item))
}
