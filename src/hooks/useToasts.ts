import { useCallback, useState } from 'react'
import type { ToastMessage } from '../types'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const push = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((t) => [...t, { id, text, type }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  return { toasts, push, dismiss }
}
