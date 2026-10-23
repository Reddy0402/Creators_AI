import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/** Warns before the user leaves (in-app navigation, refresh or tab close) with unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('You have unsaved changes. Leave without saving?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}
