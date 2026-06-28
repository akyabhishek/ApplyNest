type RuntimeMessage = {
  type: string
  payload?: unknown
}

export const hasRuntime = () =>
  typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage)

export async function sendRuntimeMessage<TResponse>(message: RuntimeMessage): Promise<TResponse> {
  if (!hasRuntime()) {
    throw new Error('Chrome runtime is not available in this context')
  }

  return chrome.runtime.sendMessage(message) as Promise<TResponse>
}
