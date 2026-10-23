import { useCallback, useEffect, useState } from 'react'

/** A short-lived success message. Only call show() after the backend has confirmed the change. */
export function useNotice(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs])

  const show = useCallback((text: string) => setMessage(text), [])
  return { message, show }
}
