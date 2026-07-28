import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, ChevronDown, GripVertical, Search, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEventHandler, FormEvent } from 'react'
import { sendRuntimeMessage } from '../shared/messaging'
import { getDefaultIconForKey, getIconEntry } from '../shared/icon-map'
import { IconPicker } from '../shared/icon-picker'
import type { ApplyNestState, FieldCategory } from '../shared/types'

const categories: FieldCategory[] = ['personal', 'professional', 'education', 'faq', 'links']

const emptyForm = {
  label: '',
  key: '',
  value: '',
  category: 'personal' as FieldCategory,
  icon: undefined as string | undefined
}

const emptyTemplateForm = {
  name: '',
  content: ''
}

type FieldPreset = {
  label: string
  key: string
  category: FieldCategory
  placeholder: string
}

type GuidedQuestion = {
  label: string
  key: string
  category: FieldCategory
  placeholder: string
}

const FIELD_PRESETS: FieldPreset[] = [
  { label: 'First Name', key: 'first_name', category: 'personal', placeholder: 'Alex' },
  { label: 'Middle Name', key: 'middle_name', category: 'personal', placeholder: 'Daniel' },
  { label: 'Last Name', key: 'last_name', category: 'personal', placeholder: 'Jordan' },
  { label: 'Full Name', key: 'full_name', category: 'personal', placeholder: 'Alex Jordan' },
  {
    label: 'Email',
    key: 'email',
    category: 'personal',
    placeholder: 'alex.jordan@example.com'
  },
  { label: 'Phone', key: 'phone', category: 'personal', placeholder: '9876543210' },
  {
    label: 'LinkedIn',
    key: 'linkedin',
    category: 'links',
    placeholder: 'https://linkedin.com/in/your-profile'
  },
  {
    label: 'GitHub',
    key: 'github',
    category: 'links',
    placeholder: 'https://github.com/your-handle'
  },
  {
    label: 'Notice Period',
    key: 'notice_period',
    category: 'professional',
    placeholder: '30 days'
  },
  {
    label: 'Current CTC',
    key: 'current_ctc',
    category: 'professional',
    placeholder: '2000000'
  },
  {
    label: 'Expected CTC',
    key: 'expected_ctc',
    category: 'professional',
    placeholder: '2500000'
  }
]

const GUIDED_SETUP_QUESTIONS: GuidedQuestion[] = [
  { label: 'First Name', key: 'first_name', category: 'personal', placeholder: 'Alex' },
  { label: 'Middle Name', key: 'middle_name', category: 'personal', placeholder: 'Daniel' },
  { label: 'Last Name', key: 'last_name', category: 'personal', placeholder: 'Jordan' },
  {
    label: 'Email',
    key: 'email',
    category: 'personal',
    placeholder: 'alex.jordan@example.com'
  },
  { label: 'Phone', key: 'phone', category: 'personal', placeholder: '9876543210' },
  {
    label: 'LinkedIn',
    key: 'linkedin',
    category: 'links',
    placeholder: 'https://linkedin.com/in/your-profile'
  },
  {
    label: 'GitHub',
    key: 'github',
    category: 'links',
    placeholder: 'https://github.com/your-handle'
  },
  {
    label: 'Notice Period',
    key: 'notice_period',
    category: 'professional',
    placeholder: '30 days'
  },
  {
    label: 'Current CTC',
    key: 'current_ctc',
    category: 'professional',
    placeholder: '2000000'
  },
  {
    label: 'Expected CTC',
    key: 'expected_ctc',
    category: 'professional',
    placeholder: '2500000'
  }
]

const toDefaultKey = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'custom_field'
}

const isString = (value: unknown): value is string => typeof value === 'string'

const AI_SETUP_PROMPT = `I am setting up my ApplyNest job application vault.

You are an expert recruiter assistant. Read my profile details and return ONLY a valid JSON object that matches this exact schema:
{
  "fields": [
    {
      "id": "string-uuid",
      "key": "snake_case_key",
      "label": "Human readable label",
      "value": "value from resume",
      "category": "personal | professional | education | faq | links",
      "aliases": ["alias1", "alias2"]
    }
  ],
  "templates": [
    {
      "id": "string-uuid",
      "name": "Cover letter template name",
      "content": "Template text"
    }
  ],
  "recent": []
}

Rules:
1) Return only JSON, no markdown, no explanation.
2) Use realistic values from the profile details I provide.
3) Generate useful fields like full_name, email, phone, linkedin, github, portfolio, current_role, total_experience, notice_period, current_ctc, expected_ctc, preferred_location.
4) Keep category valid: personal, professional, education, faq, links.
5) If a value is unknown, skip that field.
6) Use unique ids for all entries.
7) Keep recent as an empty array.

Template quality requirements (important):
8) Create 3 cover letter templates by default unless my data is too limited.
9) Template names should be: "General Application", "Role-Specific Application", "Referral / Networking Follow-up".
10) Templates must include placeholders where relevant, such as {{company_name}}, {{role_title}}, {{hiring_manager}}, {{job_requirements}}, {{top_skills}}, {{years_experience}}.
11) Keep each template concise (120-220 words), specific, and achievement-oriented.
12) Avoid generic fluff. Reference measurable impact when available (for example, percentages, time saved, revenue impact, scale handled).
13) If I provide target role or job description details, tailor the "Role-Specific Application" template directly to that target.
14) Use a professional, confident tone and a clear call to action in the closing paragraph.`

const normalizeImportedState = (value: unknown): ApplyNestState | null => {
  if (!value || typeof value !== 'object') return null

  const source = value as Record<string, unknown>

  const fields = Array.isArray(source.fields)
    ? source.fields
        .filter(
          (
            entry
          ): entry is {
            id: string
            key: string
            label: string
            value: string
            category: string
            aliases?: unknown
          } => {
            if (!entry || typeof entry !== 'object') return false
            const item = entry as Record<string, unknown>
            return (
              isString(item.id) &&
              isString(item.key) &&
              isString(item.label) &&
              isString(item.value) &&
              (item.category === 'personal' ||
                item.category === 'professional' ||
                item.category === 'education' ||
                item.category === 'faq' ||
                item.category === 'links')
            )
          }
        )
        .map((item) => ({
          id: item.id,
          key: item.key,
          label: item.label,
          value: item.value,
          category: item.category as FieldCategory,
          aliases: Array.isArray(item.aliases) ? item.aliases.filter(isString) : [],
          icon: isString((item as Record<string, unknown>).icon)
            ? ((item as Record<string, unknown>).icon as string)
            : undefined
        }))
    : []

  const templates = Array.isArray(source.templates)
    ? source.templates
        .filter((entry): entry is { id: string; name: string; content: string } => {
          if (!entry || typeof entry !== 'object') return false
          const item = entry as Record<string, unknown>
          return isString(item.id) && isString(item.name) && isString(item.content)
        })
        .map((item) => ({ id: item.id, name: item.name, content: item.content }))
    : []

  // Backward compatibility: map legacy faqs array into regular fields with faq category.
  const legacyFaqFields = Array.isArray(source.faqs)
    ? source.faqs
        .filter((entry): entry is { id: string; question: string; answer: string } => {
          if (!entry || typeof entry !== 'object') return false
          const item = entry as Record<string, unknown>
          return isString(item.id) && isString(item.question) && isString(item.answer)
        })
        .map((item) => ({
          id: item.id,
          key: toDefaultKey(item.question),
          label: item.question,
          value: item.answer,
          category: 'faq' as const,
          aliases: [item.question.toLowerCase()]
        }))
    : []

  const recent = Array.isArray(source.recent)
    ? source.recent
        .filter(
          (
            entry
          ): entry is {
            id: string
            fieldId: string
            label: string
            value: string
            copiedAt: string
          } => {
            if (!entry || typeof entry !== 'object') return false
            const item = entry as Record<string, unknown>
            return (
              isString(item.id) &&
              isString(item.fieldId) &&
              isString(item.label) &&
              isString(item.value) &&
              isString(item.copiedAt)
            )
          }
        )
        .map((item) => ({
          id: item.id,
          fieldId: item.fieldId,
          label: item.label,
          value: item.value,
          copiedAt: item.copiedAt
        }))
    : []

  return {
    fields: [...fields, ...legacyFaqFields],
    templates,
    recent
  }
}

type SortableFieldCardProps = {
  field: ApplyNestState['fields'][number]
  onEdit: (field: ApplyNestState['fields'][number]) => void
  onRemove: (field: ApplyNestState['fields'][number]) => void
}

function SortableFieldCard({ field, onEdit, onRemove }: SortableFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-white/6 bg-zinc-900/50 p-4 transition-all duration-200 hover:border-white/12"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {field.icon &&
            (() => {
              const entry = getIconEntry(field.icon)
              if (!entry) return null
              const Icon = entry.component
              return <Icon className="h-4 w-4 shrink-0 text-indigo-400" />
            })()}
          <div>
            <p className="text-sm font-semibold text-white">{field.label}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{field.key}</p>
          </div>
        </div>
        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-300">
          {field.category}
        </span>
      </div>

      <p className="mt-3 break-words text-sm text-zinc-300">{field.value}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(field)}
          className="rounded-md bg-white/5 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/8 hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onRemove(field)}
          className="rounded-md bg-rose-500/10 px-3 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/15"
        >
          Remove
        </button>
      </div>
    </article>
  )
}

export function OptionsApp() {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [aiSetupOpen, setAiSetupOpen] = useState(false)
  const [aiJsonInput, setAiJsonInput] = useState('')
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [helperMessage, setHelperMessage] = useState('')
  const [guidedSetupOpen, setGuidedSetupOpen] = useState(false)
  const [guidedStepIndex, setGuidedStepIndex] = useState(0)
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({})
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'fields' | 'templates'>('fields')
  const [templateModalMode, setTemplateModalMode] = useState<'add' | 'edit' | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [newSiteInput, setNewSiteInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('applynest_theme') as 'dark' | 'light' | 'system') ?? 'system'
    }
    return 'system'
  })

  // Theme effect
  useEffect(() => {
    const applyTheme = (mode: 'dark' | 'light' | 'system') => {
      let resolved: 'dark' | 'light' =
        mode === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : mode
      document.documentElement.setAttribute('data-theme', resolved)
    }
    applyTheme(theme)
    localStorage.setItem('applynest_theme', theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme('system')
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    }
  }, [theme])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      // Escape to close modals or clear search
      if (event.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false)
          setSettingsMessage('')
          return
        }
        if (modalMode) {
          setModalMode(null)
          setEditingFieldId(null)
          setForm(emptyForm)
          return
        }
        if (templateModalMode) {
          setTemplateModalMode(null)
          setEditingTemplateId(null)
          setTemplateForm(emptyTemplateForm)
          return
        }
        if (deleteScopeOpen) {
          setDeleteScopeOpen(false)
          return
        }
        if (guidedSetupOpen) {
          setGuidedSetupOpen(false)
          return
        }
        if (aiSetupOpen) {
          setAiSetupOpen(false)
          setAiJsonInput('')
          return
        }
        if (searchQuery) {
          setSearchQuery('')
          searchInputRef.current?.blur()
          return
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    settingsOpen,
    modalMode,
    templateModalMode,
    deleteScopeOpen,
    guidedSetupOpen,
    aiSetupOpen,
    searchQuery
  ])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const stateQuery = useQuery({
    queryKey: ['options-state'],
    queryFn: () => sendRuntimeMessage<ApplyNestState>({ type: 'GET_STATE' })
  })

  const customSitesQuery = useQuery({
    queryKey: ['custom-sites'],
    queryFn: () => sendRuntimeMessage<string[]>({ type: 'GET_CUSTOM_SITES' })
  })

  const addFieldMutation = useMutation({
    mutationFn: (payload: {
      label: string
      key: string
      value: string
      category: FieldCategory
      icon?: string
    }) =>
      sendRuntimeMessage<ApplyNestState>({
        type: 'ADD_FIELD',
        payload
      }),
    onSuccess: async () => {
      setForm(emptyForm)
      setModalMode(null)
      await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    }
  })

  const updateFieldMutation = useMutation({
    mutationFn: (payload: {
      id: string
      label: string
      key: string
      value: string
      category: FieldCategory
      icon?: string
    }) =>
      sendRuntimeMessage<ApplyNestState>({
        type: 'UPDATE_FIELD',
        payload
      }),
    onSuccess: async () => {
      setModalMode(null)
      setEditingFieldId(null)
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    }
  })

  const removeFieldMutation = useMutation({
    mutationFn: (payload: { id: string }) =>
      sendRuntimeMessage<ApplyNestState>({
        type: 'REMOVE_FIELD',
        payload
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    }
  })

  const clearAllFieldsMutation = useMutation({
    mutationFn: () => sendRuntimeMessage<ApplyNestState>({ type: 'CLEAR_ALL_FIELDS' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    }
  })

  const importStateMutation = useMutation({
    mutationFn: (payload: { state: ApplyNestState }) =>
      sendRuntimeMessage<ApplyNestState>({
        type: 'IMPORT_STATE',
        payload
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    }
  })

  const fields = stateQuery.data?.fields ?? []
  const templates = stateQuery.data?.templates ?? []

  const filteredFields = searchQuery.trim()
    ? fields.filter((f) => {
        const q = searchQuery.toLowerCase()
        return (
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.value.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
        )
      })
    : fields

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(fields, oldIndex, newIndex)
    // Optimistic update
    queryClient.setQueryData(['options-state'], (prev: ApplyNestState | undefined) =>
      prev ? { ...prev, fields: reordered } : prev
    )
    await sendRuntimeMessage({
      type: 'REORDER_FIELDS',
      payload: { orderedIds: reordered.map((f) => f.id) }
    })
    await queryClient.invalidateQueries({ queryKey: ['options-state'] })
  }

  const saveTemplates = async (nextTemplates: ApplyNestState['templates']) => {
    const state = stateQuery.data
    if (!state) return

    await importStateMutation.mutateAsync({
      state: {
        ...state,
        templates: nextTemplates
      }
    })
  }

  const findExistingFieldByKey = (key: string) => {
    const normalized = key.trim().toLowerCase()
    return fields.find((field) => field.key.trim().toLowerCase() === normalized)
  }

  const openAddModal = () => {
    setEditingFieldId(null)
    setForm(emptyForm)
    setHelperMessage('')
    setModalMode('add')
  }

  const openEditModal = (field: ApplyNestState['fields'][number]) => {
    setEditingFieldId(field.id)
    setForm({
      label: field.label,
      key: field.key,
      value: field.value,
      category: field.category,
      icon: field.icon
    })
    setHelperMessage('')
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingFieldId(null)
    setForm(emptyForm)
    setHelperMessage('')
  }

  const applyPreset = (preset: FieldPreset) => {
    setForm((prev) => ({
      label: preset.label,
      key: preset.key,
      category: preset.category,
      value: prev.value,
      icon: getDefaultIconForKey(preset.key) ?? prev.icon
    }))
    setHelperMessage(`Preset selected: ${preset.label}`)
  }

  const openGuidedSetup = () => {
    setGuidedSetupOpen(true)
    setGuidedStepIndex(0)
    setGuidedAnswers({})
  }

  const openAiSetup = () => {
    setAiSetupOpen(true)
  }

  const closeAiSetup = () => {
    setAiSetupOpen(false)
    setAiJsonInput('')
  }

  const closeGuidedSetup = () => {
    setGuidedSetupOpen(false)
    setGuidedStepIndex(0)
    setGuidedAnswers({})
  }

  const openAddTemplateModal = () => {
    setTemplateModalMode('add')
    setEditingTemplateId(null)
    setTemplateForm(emptyTemplateForm)
  }

  const openEditTemplateModal = (template: ApplyNestState['templates'][number]) => {
    setTemplateModalMode('edit')
    setEditingTemplateId(template.id)
    setTemplateForm({
      name: template.name,
      content: template.content
    })
  }

  const closeTemplateModal = () => {
    setTemplateModalMode(null)
    setEditingTemplateId(null)
    setTemplateForm(emptyTemplateForm)
  }

  const onModalSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.label || !form.value) return

    const resolvedKey = form.key.trim() || toDefaultKey(form.label)

    // Field validation
    if (form.category === 'links') {
      const val = form.value.trim()
      if (
        val &&
        !/^https?:\/\/.+/i.test(val) &&
        !/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}/i.test(val)
      ) {
        setHelperMessage('Value looks like a link field but is not a valid URL.')
        return
      }
    }
    if (resolvedKey === 'email' || form.label.toLowerCase().includes('email')) {
      if (form.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.trim())) {
        setHelperMessage('Please enter a valid email address.')
        return
      }
    }
    if (resolvedKey === 'phone' || form.label.toLowerCase().includes('phone')) {
      if (form.value.trim() && !/^[\d\s\+\-\(\)]{7,20}$/.test(form.value.trim())) {
        setHelperMessage('Please enter a valid phone number.')
        return
      }
    }

    // Duplicate key warning (only on add)
    if (modalMode === 'add') {
      const existingField = findExistingFieldByKey(resolvedKey)
      if (existingField) {
        const confirmed = window.confirm(
          `A field with key "${resolvedKey}" already exists. Update the existing field?`
        )
        if (!confirmed) return
        await updateFieldMutation.mutateAsync({
          id: existingField.id,
          ...form,
          key: resolvedKey
        })
        setHelperMessage('Existing key found. Updated the existing field.')
        return
      }
    }

    const payload = {
      ...form,
      key: resolvedKey
    }

    if (modalMode === 'edit' && editingFieldId) {
      await updateFieldMutation.mutateAsync({
        id: editingFieldId,
        ...payload
      })
      setHelperMessage('Field updated.')
      return
    }

    await addFieldMutation.mutateAsync(payload)
    setHelperMessage('Field added.')
  }

  const handleRemoveField = async (field: ApplyNestState['fields'][number]) => {
    const confirmed = window.confirm(`Remove "${field.label}"?`)
    if (!confirmed) return

    await removeFieldMutation.mutateAsync({ id: field.id })
    setHelperMessage(`Removed ${field.label}.`)
  }

  const openDeleteScope = () => {
    setDeleteScopeOpen(true)
  }

  const closeDeleteScope = () => {
    setDeleteScopeOpen(false)
  }

  const handleDeleteFieldsOnly = async () => {
    await clearAllFieldsMutation.mutateAsync()
    setHelperMessage('All fields deleted.')
    closeDeleteScope()
  }

  const handleDeleteTemplatesOnly = async () => {
    await saveTemplates([])
    setHelperMessage('All templates deleted.')
    closeDeleteScope()
  }

  const handleDeleteEverything = async () => {
    const state = stateQuery.data
    if (!state) return

    await importStateMutation.mutateAsync({
      state: {
        ...state,
        fields: [],
        templates: [],
        recent: []
      }
    })

    setHelperMessage('Everything deleted.')
    closeDeleteScope()
  }

  const handleExportState = () => {
    const state = stateQuery.data
    if (!state) {
      setHelperMessage('Nothing to export yet.')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `applynest-backup-${timestamp}.json`
    const content = JSON.stringify(state, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    URL.revokeObjectURL(url)
    setHelperMessage('Backup exported.')
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFile: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      const content = await file.text()
      const parsed = JSON.parse(content) as unknown
      const normalized = normalizeImportedState(parsed)

      if (!normalized) {
        setSettingsMessage('Import failed: invalid backup format.')
        return
      }

      await importStateMutation.mutateAsync({ state: normalized })
      setSettingsMessage('Backup imported successfully.')
    } catch {
      setSettingsMessage('Import failed: unable to read file.')
    }
  }

  const handleTemplateSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const name = templateForm.name.trim()
    const content = templateForm.content.trim()

    if (!name || !content) {
      setHelperMessage('Template name and content are required.')
      return
    }

    if (templateModalMode === 'edit' && editingTemplateId) {
      const nextTemplates = templates.map((template) =>
        template.id === editingTemplateId ? { ...template, name, content } : template
      )

      await saveTemplates(nextTemplates)
      setHelperMessage('Template updated.')
      closeTemplateModal()
      return
    }

    const nextTemplates = [
      {
        id: crypto.randomUUID(),
        name,
        content
      },
      ...templates
    ]

    await saveTemplates(nextTemplates)
    setHelperMessage('Template added.')
    closeTemplateModal()
  }

  const handleDeleteTemplate = async (template: ApplyNestState['templates'][number]) => {
    const confirmed = window.confirm(`Remove template "${template.name}"?`)
    if (!confirmed) return

    const nextTemplates = templates.filter((entry) => entry.id !== template.id)
    await saveTemplates(nextTemplates)
    setHelperMessage(`Removed template ${template.name}.`)
  }

  const handleCopyTemplate = async (template: ApplyNestState['templates'][number]) => {
    try {
      await navigator.clipboard.writeText(template.content)
      setHelperMessage(`Copied template ${template.name}.`)
    } catch {
      setHelperMessage('Template copy failed. Try again.')
    }
  }

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_SETUP_PROMPT)
      setHelperMessage('AI setup prompt copied.')
    } catch {
      setHelperMessage('Unable to copy prompt. Please copy manually.')
    }
  }

  const extractJsonFromInput = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''

    if (trimmed.startsWith('```')) {
      return trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
    }

    return trimmed
  }

  const handleImportAiJson = async () => {
    const candidate = extractJsonFromInput(aiJsonInput)
    if (!candidate) {
      setHelperMessage('Paste generated JSON first.')
      return
    }

    try {
      const parsed = JSON.parse(candidate) as unknown
      const normalized = normalizeImportedState(parsed)

      if (!normalized) {
        setHelperMessage('AI import failed: invalid JSON format.')
        return
      }

      await importStateMutation.mutateAsync({ state: normalized })
      setHelperMessage('AI setup imported successfully.')
      closeAiSetup()
    } catch {
      setHelperMessage('AI import failed: invalid JSON.')
    }
  }

  const upsertFieldByKey = async (
    key: string,
    label: string,
    value: string,
    existingByKey: Map<string, ApplyNestState['fields'][number]>
  ) => {
    const existing = existingByKey.get(key)

    if (existing) {
      const updated = await sendRuntimeMessage<ApplyNestState>({
        type: 'UPDATE_FIELD',
        payload: {
          id: existing.id,
          label,
          key,
          value,
          category: 'personal'
        }
      })

      const refreshed = updated.fields.find((field) => field.key.trim().toLowerCase() === key)
      if (refreshed) {
        existingByKey.set(key, refreshed)
      }

      return
    }

    const added = await sendRuntimeMessage<ApplyNestState>({
      type: 'ADD_FIELD',
      payload: {
        label,
        key,
        value,
        category: 'personal'
      }
    })

    const newField = added.fields.find((field) => field.key.trim().toLowerCase() === key)
    if (newField) {
      existingByKey.set(key, newField)
    }
  }

  const handleGuidedAnswerChange = (value: string) => {
    const currentQuestion = GUIDED_SETUP_QUESTIONS[guidedStepIndex]
    setGuidedAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: value
    }))
  }

  const handleGuidedNext = () => {
    setGuidedStepIndex((prev) => Math.min(prev + 1, GUIDED_SETUP_QUESTIONS.length - 1))
  }

  const handleGuidedBack = () => {
    setGuidedStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleGuidedInputEnter = async () => {
    if (guidedStepIndex < GUIDED_SETUP_QUESTIONS.length - 1) {
      handleGuidedNext()
      return
    }

    await handleGuidedFinish()
  }

  const handleGuidedFinish = async () => {
    const existingByKey = new Map(
      fields.map((field) => [field.key.trim().toLowerCase(), field] as const)
    )

    let updatedCount = 0

    for (const question of GUIDED_SETUP_QUESTIONS) {
      const answer = (guidedAnswers[question.key] ?? '').trim()
      if (!answer) {
        continue
      }

      await upsertFieldByKey(question.key, question.label, answer, existingByKey)
      updatedCount += 1
    }

    await queryClient.invalidateQueries({ queryKey: ['options-state'] })
    setHelperMessage(
      updatedCount > 0
        ? `Guided setup saved ${updatedCount} field${updatedCount > 1 ? 's' : ''}.`
        : 'No values entered. Nothing was saved.'
    )
    closeGuidedSetup()
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-8 text-white">
      <section className="applynest-glass rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ApplyNest logo"
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">ApplyNest Vault</h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                Everything is stored locally in chrome.storage by default.
              </p>
            </div>
          </div>
          <div className="relative flex gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={openAiSetup}
              className="rounded-lg bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition-all duration-200 hover:bg-violet-500/20 active:scale-[0.98]"
            >
              AI Based Setup
            </button>
            <button
              type="button"
              onClick={openGuidedSetup}
              className="rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-all duration-200 hover:bg-indigo-500/20 active:scale-[0.98]"
            >
              Guided Setup
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-400 active:scale-[0.98]"
            >
              Add Field
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              title="Settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 text-zinc-400 transition-all duration-200 hover:border-white/12 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {helperMessage && <p className="mt-3 text-xs text-indigo-300">{helperMessage}</p>}

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields... (Ctrl+K)"
              className="h-10 w-full rounded-lg border border-white/8 bg-zinc-950/60 pl-10 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 inline-flex rounded-lg border border-white/6 bg-zinc-950/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              activeTab === 'fields'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              activeTab === 'templates'
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Templates
          </button>
        </div>

        {activeTab === 'fields' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredFields.map((f) => f.id)} strategy={rectSortingStrategy}>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredFields.map((field) => (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    onEdit={openEditModal}
                    onRemove={handleRemoveField}
                  />
                ))}

                {!filteredFields.length && searchQuery && (
                  <div className="rounded-xl border border-white/6 bg-zinc-900/40 p-4 text-sm text-zinc-400">
                    No fields match &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}

                {!fields.length && !searchQuery && (
                  <div className="rounded-xl border border-white/6 bg-zinc-900/40 p-4 text-sm text-zinc-400">
                    No fields added yet. Click Add Field to create your first field.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {activeTab === 'templates' && (
          <div className="mt-6 rounded-xl border border-white/6 bg-zinc-900/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Cover Letter Templates</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Save reusable templates and copy them while applying.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddTemplateModal}
                className="rounded-md bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-all duration-200 hover:bg-indigo-500/20"
              >
                Add Template
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-lg border border-white/6 bg-zinc-950/50 p-3"
                >
                  <p className="text-sm font-semibold text-white">{template.name}</p>
                  <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{template.content}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(template)}
                      className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/8"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditTemplateModal(template)}
                      className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/8"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template)}
                      className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {!templates.length && (
                <div className="rounded-lg border border-white/6 bg-zinc-950/40 p-3 text-xs text-zinc-400">
                  No templates yet. Click Add Template to create one.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {deleteScopeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-md rounded-xl border border-white/8 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Delete Data</h2>
            <p className="mt-1 text-xs text-zinc-400">Choose what you want to delete.</p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleDeleteFieldsOnly()}
                className="block w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-left text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
              >
                Delete All Fields
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteTemplatesOnly()}
                className="block w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-left text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
              >
                Delete All Templates
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteEverything()}
                className="block w-full rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-left text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
              >
                Delete Everything
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closeDeleteScope}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-lg rounded-xl border border-white/8 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">
              {modalMode === 'add' ? 'Add Field' : 'Edit Field'}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Manage your reusable job application fields.
            </p>

            {modalMode === 'add' && (
              <div className="mt-4 rounded-lg border border-white/6 bg-zinc-950/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Use a preset</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FIELD_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/20"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={onModalSubmit} className="mt-4 space-y-3">
              <input
                placeholder="Field label"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                className="w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
              <input
                placeholder={`Key (optional, default: ${toDefaultKey(form.label || 'custom_field')})`}
                value={form.key}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                className="w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
              <input
                placeholder={
                  FIELD_PRESETS.find((preset) => preset.key === form.key)?.placeholder ?? 'Value'
                }
                value={form.value}
                onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                className="w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value as FieldCategory }))
                }
                className="w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div>
                <p className="mb-1 text-xs text-zinc-500">Icon</p>
                <IconPicker
                  value={form.icon}
                  onChange={(iconId) => setForm((prev) => ({ ...prev, icon: iconId }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
                >
                  {modalMode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {aiSetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-3xl rounded-xl border border-white/8 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">AI Based Setup</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Use any GenAI tool (Claude, ChatGPT, Gemini, Perplexity, etc.), share your profile
              details with the prompt below, then paste the JSON output here.
            </p>

            <div className="mt-4 rounded-lg border border-white/6 bg-zinc-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Prompt to copy</p>
              <textarea
                readOnly
                value={AI_SETUP_PROMPT}
                className="mt-2 h-52 w-full rounded-lg border border-white/8 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyAiPrompt}
                  className="rounded-md bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                >
                  Copy Prompt
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/6 bg-zinc-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Paste generated JSON
              </p>
              <textarea
                value={aiJsonInput}
                onChange={(event) => setAiJsonInput(event.target.value)}
                placeholder="Paste the JSON response from your GenAI tool..."
                className="mt-2 h-44 w-full rounded-lg border border-white/8 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAiSetup}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportAiJson}
                className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-violet-400"
              >
                Import JSON
              </button>
            </div>
          </section>
        </div>
      )}

      {templateModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-2xl rounded-xl border border-white/8 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">
              {templateModalMode === 'add' ? 'Add Template' : 'Edit Template'}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Save reusable cover letter snippets for quick copy.
            </p>

            <form onSubmit={handleTemplateSubmit} className="mt-4 space-y-3">
              <input
                placeholder="Template name"
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />

              <textarea
                placeholder="Template content"
                value={templateForm.content}
                onChange={(event) =>
                  setTemplateForm((prev) => ({ ...prev, content: event.target.value }))
                }
                className="h-44 w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeTemplateModal}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
                >
                  {templateModalMode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {guidedSetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-lg rounded-xl border border-white/8 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Guided Setup</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Answer one question at a time. You can skip any field.
            </p>

            <div className="mt-4 rounded-lg border border-white/6 bg-zinc-950/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Question {guidedStepIndex + 1} of {GUIDED_SETUP_QUESTIONS.length}
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {GUIDED_SETUP_QUESTIONS[guidedStepIndex].label}
              </p>
              <input
                value={guidedAnswers[GUIDED_SETUP_QUESTIONS[guidedStepIndex].key] ?? ''}
                onChange={(event) => handleGuidedAnswerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  void handleGuidedInputEnter()
                }}
                placeholder={GUIDED_SETUP_QUESTIONS[guidedStepIndex].placeholder}
                className="mt-3 w-full rounded-lg border border-white/8 bg-zinc-950 px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                onClick={closeGuidedSetup}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGuidedBack}
                  disabled={guidedStepIndex === 0}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  Back
                </button>

                {guidedStepIndex < GUIDED_SETUP_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleGuidedNext}
                    className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGuidedFinish}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-emerald-400"
                  >
                    Save All
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <section className="w-full max-w-lg rounded-xl border border-white/8 bg-zinc-900 px-6 py-6 shadow-2xl">
            <h2 className="text-center text-lg font-semibold text-white">Settings</h2>

            {settingsMessage && (
              <p className="mt-2 text-center text-xs text-indigo-300">{settingsMessage}</p>
            )}

            <div className="mt-5">
              <h3 className="text-sm font-medium text-white">Custom Sites</h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Add websites where the quick panel should appear. Enter the domain only (e.g.
                naukri.com).
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  value={newSiteInput}
                  onChange={(event) => setNewSiteInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    const site = newSiteInput
                      .trim()
                      .replace(/^https?:\/\//, '')
                      .replace(/\/+$/, '')
                    if (!site) return
                    const current = customSitesQuery.data ?? []
                    if (current.includes(site)) {
                      setSettingsMessage('Site already added.')
                      return
                    }
                    void sendRuntimeMessage({
                      type: 'SET_CUSTOM_SITES',
                      payload: { sites: [...current, site] }
                    }).then(() => {
                      setNewSiteInput('')
                      setSettingsMessage(`Added ${site}`)
                      void queryClient.invalidateQueries({ queryKey: ['custom-sites'] })
                    })
                  }}
                  placeholder="example.com"
                  className="h-9 flex-1 rounded-lg border border-white/8 bg-zinc-950 px-4 text-sm outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    const site = newSiteInput
                      .trim()
                      .replace(/^https?:\/\//, '')
                      .replace(/\/+$/, '')
                    if (!site) return
                    const current = customSitesQuery.data ?? []
                    if (current.includes(site)) {
                      setSettingsMessage('Site already added.')
                      return
                    }
                    void sendRuntimeMessage({
                      type: 'SET_CUSTOM_SITES',
                      payload: { sites: [...current, site] }
                    }).then(() => {
                      setNewSiteInput('')
                      setSettingsMessage(`Added ${site}`)
                      void queryClient.invalidateQueries({ queryKey: ['custom-sites'] })
                    })
                  }}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-400 active:scale-[0.98]"
                >
                  Add
                </button>
              </div>

              <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
                {(customSitesQuery.data ?? []).map((site) => (
                  <div
                    key={site}
                    className="flex items-center justify-between rounded-lg border border-white/6 bg-zinc-950/50 px-3 py-2"
                  >
                    <span className="text-xs text-zinc-200">{site}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = customSitesQuery.data ?? []
                        const next = current.filter((s) => s !== site)
                        void sendRuntimeMessage({
                          type: 'SET_CUSTOM_SITES',
                          payload: { sites: next }
                        }).then(() => {
                          setSettingsMessage(`Removed ${site}`)
                          void queryClient.invalidateQueries({ queryKey: ['custom-sites'] })
                        })
                      }}
                      className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/15"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {!(customSitesQuery.data ?? []).length && (
                  <div className="rounded-lg border border-white/6 bg-zinc-950/40 p-3 text-xs text-zinc-400">
                    No custom sites added. The quick panel already works on major job portals like
                    LinkedIn, Naukri, Indeed, Greenhouse, Lever, and more.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-white/6 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Appearance</h3>
                  <p className="mt-0.5 text-xs text-zinc-400">Color theme</p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setThemeDropdownOpen((v) => !v)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/8 bg-zinc-950 px-3 text-sm text-white transition-all duration-200 hover:border-white/12 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                  >
                    <span>
                      {theme === 'system' ? 'System Default' : theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${themeDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {themeDropdownOpen && (
                    <div className="absolute right-0 top-11 z-30 w-44 rounded-lg border border-white/8 bg-zinc-900 p-1 shadow-2xl animate-in fade-in">
                      {(
                        [
                          ['system', 'System Default'],
                          ['dark', 'Dark'],
                          ['light', 'Light']
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setTheme(value)
                            setThemeDropdownOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                            theme === value
                              ? 'bg-indigo-500/10 text-indigo-300'
                              : 'text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          {label}
                          {theme === value && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/6 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Data</h3>
                  <p className="mt-0.5 text-xs text-zinc-400">Export or import vault backup</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportState()
                      setSettingsMessage('Backup exported.')
                    }}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleImportClick()
                    }}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/6 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-rose-300">Danger Zone</h3>
                  <p className="mt-0.5 text-xs text-zinc-400">Permanently delete vault data</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    setSettingsMessage('')
                    openDeleteScope()
                  }}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  Delete...
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false)
                  setSettingsMessage('')
                }}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/8"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
