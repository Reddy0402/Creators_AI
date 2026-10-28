import { Check, CheckCircle2, Copy, Pencil, Save, Shuffle, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { assetApi } from '../api/assetApi'
import { assetToText } from '../lib/assetText'
import { errorMessage, formatDate } from '../lib/format'
import { REFINE_ACTIONS, contentTypeLabel, type Asset, type AssetContent, type RefineAction } from '../types/asset'
import { PLATFORMS, type Platform } from '../types/campaign'
import { AssetEditor, AssetView } from './AssetBody'
import { ErrorMessage } from './ErrorMessage'
import { Spinner } from './LoadingState'

interface Props {
  asset: Asset
  onUpdated: (asset: Asset) => void
  onDeleted: (id: number) => void
  /** A refined copy was saved as a new asset; the original is untouched. */
  onRefined: (asset: Asset) => void
  /** Generates another variation from the campaign context. Rejects with an Error on failure. */
  onExploreAnother: (asset: Asset) => Promise<void>
  onNotify: (message: string) => void
  onDirtyChange: (id: number, dirty: boolean) => void
}

type Working = 'save' | 'refine' | 'explore' | 'status' | 'delete' | null

export function ContentCard({
  asset,
  onUpdated,
  onDeleted,
  onRefined,
  onExploreAnother,
  onNotify,
  onDirtyChange,
}: Props) {
  const [draft, setDraft] = useState<AssetContent | null>(null)
  const [working, setWorking] = useState<Working>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [refineOpen, setRefineOpen] = useState(false)
  const [action, setAction] = useState<RefineAction>('shorten')
  const [targetPlatform, setTargetPlatform] = useState<Platform>(
    PLATFORMS.find((p) => p !== asset.platform) ?? 'LinkedIn',
  )

  const editing = draft !== null
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(asset.content)
  const busy = working !== null
  const approved = asset.status === 'approved'

  useEffect(() => onDirtyChange(asset.id, dirty), [asset.id, dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(asset.id, false), [asset.id, onDirtyChange])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function run(kind: Exclude<Working, null>, task: () => Promise<void>) {
    if (busy) return
    setWorking(kind)
    setError(null)
    try {
      await task()
    } catch (err) {
      setError(errorMessage(err)) // edits and existing content stay as they were
    } finally {
      setWorking(null)
    }
  }

  const save = () =>
    run('save', async () => {
      const updated = await assetApi.update(asset.id, { content: draft! })
      onUpdated(updated)
      setDraft(null)
      onNotify('Saved successfully')
    })

  const toggleApproval = () =>
    run('status', async () => {
      const updated = await assetApi.update(asset.id, {
        status: approved ? 'draft' : 'approved',
      })
      onUpdated(updated)
      onNotify(updated.status === 'approved' ? 'Marked as approved' : 'Moved back to draft')
    })

  const refine = () =>
    run('refine', async () => {
      const revised = await assetApi.refine(
        asset.id,
        action,
        action === 'adapt_platform' ? targetPlatform : undefined,
      )
      setRefineOpen(false)
      onRefined(revised)
      onNotify('Revised version added')
    })

  const explore = () =>
    run('explore', async () => {
      await onExploreAnother(asset)
    })

  const remove = () => {
    if (!window.confirm('Delete this content? This can’t be undone.')) return
    return run('delete', async () => {
      await assetApi.remove(asset.id)
      onDeleted(asset.id)
    })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(assetToText(asset))
      setCopied(true)
    } catch {
      setError('Couldn’t copy to the clipboard. Select the text and copy it manually.')
    }
  }

  function cancelEdit() {
    if (dirty && !window.confirm('Discard your changes to this content?')) return
    setDraft(null)
    setError(null)
  }

  return (
    <article className="card space-y-4 p-5" aria-label={asset.title}>
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-lime-soft">{contentTypeLabel(asset.content_type)}</span>
        <span className="chip bg-canvas">{asset.platform}</span>
        {approved && (
          <span className="chip gap-1 bg-success-soft">
            <CheckCircle2 className="size-3" aria-hidden /> Approved
          </span>
        )}
        {asset.source_asset_id !== null && (
          <span className="flex items-center gap-1 font-medium text-ink-mute">
            <Sparkles className="size-3" aria-hidden /> Revised version
          </span>
        )}
        <span className="ml-auto font-medium text-ink-mute">{formatDate(asset.updated_at)}</span>
      </header>

      {draft ? (
        <AssetEditor assetId={asset.id} type={asset.content_type} draft={draft} onChange={setDraft} />
      ) : (
        <AssetView asset={asset} />
      )}

      {error && <ErrorMessage message={error} />}

      {refineOpen && !editing && (
        <div className="space-y-3 rounded-none border-2 border-ink bg-canvas p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs font-semibold text-ink-soft">
              Change
              <select
                className="field"
                value={action}
                onChange={(e) => setAction(e.target.value as RefineAction)}
              >
                {REFINE_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            {action === 'adapt_platform' && (
              <label className="space-y-1 text-xs font-semibold text-ink-soft">
                Platform
                <select
                  className="field"
                  value={targetPlatform}
                  onChange={(e) => setTargetPlatform(e.target.value as Platform)}
                >
                  {PLATFORMS.filter((p) => p !== asset.platform).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn-primary" onClick={refine} disabled={busy}>
              {working === 'refine' ? <Spinner /> : <Wand2 className="size-4" aria-hidden />}
              {working === 'refine' ? 'Revising…' : 'Create revised version'}
            </button>
          </div>
          <p className="text-xs text-ink-mute">
            Your current content stays as it is. The revision is saved as a new item.
          </p>
        </div>
      )}

      <footer className="flex flex-wrap gap-2 border-t-2 border-ink pt-4">
        {editing ? (
          <>
            <button className="btn-primary" onClick={save} disabled={busy || !dirty}>
              {working === 'save' ? <Spinner /> : <Save className="size-4" aria-hidden />}
              Save changes
            </button>
            <button className="btn-ghost" onClick={cancelEdit} disabled={busy}>
              <X className="size-4" aria-hidden /> Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-secondary"
              onClick={() => {
                setDraft(structuredClone(asset.content))
                setRefineOpen(false)
                setError(null)
              }}
              disabled={busy}
            >
              <Pencil className="size-4" aria-hidden /> Edit
            </button>
            <button className="btn-secondary" onClick={copy} disabled={busy}>
              {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn-secondary" onClick={explore} disabled={busy}>
              {working === 'explore' ? <Spinner /> : <Shuffle className="size-4" aria-hidden />}
              {working === 'explore' ? 'Preparing…' : 'Explore another version'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setRefineOpen((open) => !open)}
              disabled={busy}
              aria-expanded={refineOpen}
            >
              <Wand2 className="size-4" aria-hidden /> Refine
            </button>
            <button className="btn-secondary" onClick={toggleApproval} disabled={busy}>
              {working === 'status' ? <Spinner /> : <CheckCircle2 className="size-4" aria-hidden />}
              {approved ? 'Unapprove' : 'Approve'}
            </button>
            <button className="btn-ghost ml-auto text-error" onClick={remove} disabled={busy} aria-label="Delete content">
              {working === 'delete' ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
            </button>
          </>
        )}
      </footer>
    </article>
  )
}
