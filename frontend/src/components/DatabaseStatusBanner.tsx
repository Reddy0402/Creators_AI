import { Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { systemApi } from '../api/systemApi'

/**
 * Shown at the top of the dashboard when the backend's database is unreachable.
 * Without it, a broken DATABASE_URL looks identical to "no campaigns yet",
 * which is exactly how the persistence bug went unnoticed.
 */
export function DatabaseStatusBanner() {
  const [broken, setBroken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    systemApi
      .health()
      .then((status) => {
        if (cancelled) return
        if (status.db_ok === false) {
          setBroken(
            'The backend is running, but it cannot reach its PostgreSQL database. ' +
              'No campaigns can be loaded or saved until it is fixed. ' +
              'Check DATABASE_URL in backend/.env (host, port, database name, credentials), ' +
              'make sure the database is running and reachable, then restart the backend and try again.',
          )
        } else {
          setBroken(null)
        }
      })
      .catch(() => {
        if (!cancelled) setBroken(null) // backend not reachable at all; per-page errors already explain that
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!broken) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-none border-2 border-ink bg-warning-soft px-4 py-3 text-sm font-medium text-ink shadow-brut-xs"
    >
      <Database className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="flex-1">{broken}</p>
    </div>
  )
}
