export type FieldCategory = 'personal' | 'professional' | 'education' | 'faq' | 'links'

export type Confidence = 'high' | 'medium' | 'low'

export interface VaultField {
  id: string
  key: string
  label: string
  value: string
  category: FieldCategory
  aliases: string[]
}

export interface CoverLetterTemplate {
  id: string
  name: string
  content: string
}

export interface RecentCopyItem {
  id: string
  fieldId: string
  label: string
  value: string
  copiedAt: string
}

export interface ApplyNestState {
  fields: VaultField[]
  templates: CoverLetterTemplate[]
  recent: RecentCopyItem[]
}

export interface SearchResultItem {
  id: string
  label: string
  value: string
  category: FieldCategory | 'template'
  fieldId?: string
}

export interface DetectedFieldCandidate {
  elementId: string
  hint: string
}

export interface FieldSuggestion {
  elementId: string
  fieldId: string
  label: string
  value: string
  confidence: Confidence
}

export type InsertValueFailureReason = 'NO_TARGET' | 'NO_ACTIVE_TAB' | 'CONTENT_UNAVAILABLE'

export interface InsertValueResult {
  ok: boolean
  reason?: InsertValueFailureReason
}
