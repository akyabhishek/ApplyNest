import type { InsertValueResult } from './types'

export interface FocusedFieldProbe {
  hasTarget: boolean
  hasFocus: boolean
}

export function probeFocusedField(): FocusedFieldProbe {
  const isEditable = (element: Element | null): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false
    if (element instanceof HTMLInputElement) {
      return (
        !element.disabled &&
        !element.readOnly &&
        !['hidden', 'file', 'checkbox', 'radio', 'button', 'submit', 'reset', 'image'].includes(
          element.type
        )
      )
    }
    if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly
    if (element instanceof HTMLSelectElement) return !element.disabled
    return element.isContentEditable
  }

  let activeElement: Element | null = document.activeElement
  while (
    activeElement instanceof HTMLElement &&
    activeElement.shadowRoot?.activeElement instanceof Element
  ) {
    activeElement = activeElement.shadowRoot.activeElement
  }

  const focusedMarker = document.querySelector('[data-applynest-focused="true"]')
  return {
    hasTarget: isEditable(activeElement) || isEditable(focusedMarker),
    hasFocus: document.hasFocus()
  }
}

export function insertValueIntoFocusedField(value: string): InsertValueResult {
  const isEditable = (element: Element | null): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false
    if (element instanceof HTMLInputElement) {
      return (
        !element.disabled &&
        !element.readOnly &&
        !['hidden', 'file', 'checkbox', 'radio', 'button', 'submit', 'reset', 'image'].includes(
          element.type
        )
      )
    }
    if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly
    if (element instanceof HTMLSelectElement) return !element.disabled
    return element.isContentEditable
  }

  const getActiveElement = () => {
    let activeElement: Element | null = document.activeElement
    while (
      activeElement instanceof HTMLElement &&
      activeElement.shadowRoot?.activeElement instanceof Element
    ) {
      activeElement = activeElement.shadowRoot.activeElement
    }
    return activeElement
  }

  const activeElement = getActiveElement()
  const focusedMarker = document.querySelector('[data-applynest-focused="true"]')
  const target = isEditable(activeElement)
    ? activeElement
    : isEditable(focusedMarker)
      ? focusedMarker
      : null

  if (!target) return { ok: false, reason: 'NO_TARGET' }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const prototype =
      target instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    if (valueSetter) {
      valueSetter.call(target, value)
    } else {
      target.value = value
    }

    if (target.value !== value) return { ok: false, reason: 'NO_TARGET' }
    target.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value })
    )
    target.dispatchEvent(new Event('change', { bubbles: true }))
    return { ok: true }
  }

  if (target instanceof HTMLSelectElement) {
    const option = [...target.options].find(
      (entry) =>
        entry.value.toLowerCase() === value.toLowerCase() ||
        entry.text.toLowerCase() === value.toLowerCase()
    )
    if (!option) return { ok: false, reason: 'NO_TARGET' }

    target.value = option.value
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
    return { ok: true }
  }

  const editingHost = target.closest<HTMLElement>(
    '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
  )
  if (!editingHost?.isContentEditable) return { ok: false, reason: 'NO_TARGET' }

  const selection = document.getSelection()
  const range =
    selection?.rangeCount && editingHost.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : null
  editingHost.focus({ preventScroll: true })

  if (range) {
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  if (range && document.execCommand('insertText', false, value)) {
    return { ok: true }
  }

  const insertionRange = range ?? document.createRange()
  if (!range) {
    insertionRange.selectNodeContents(editingHost)
    insertionRange.collapse(false)
  }
  insertionRange.deleteContents()
  const textNode = document.createTextNode(value)
  insertionRange.insertNode(textNode)
  insertionRange.setStartAfter(textNode)
  insertionRange.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(insertionRange)
  editingHost.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value })
  )
  return { ok: true }
}
