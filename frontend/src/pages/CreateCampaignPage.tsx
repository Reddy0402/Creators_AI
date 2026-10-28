import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { campaignApi } from '../api/campaignApi'
import { visualApi } from '../api/visualApi'
import { CampaignImageUpload } from '../components/CampaignImageUpload'
import { ErrorMessage } from '../components/ErrorMessage'
import { FormField } from '../components/FormField'
import { Spinner } from '../components/LoadingState'
import { useUnsavedGuard } from '../hooks/useUnsavedGuard'
import { errorMessage } from '../lib/format'
import { PLATFORMS, TONES, type CampaignInput } from '../types/campaign'

const EMPTY: CampaignInput = {
  name: '',
  product_or_service: '',
  target_audience: '',
  objective: '',
  platform: 'Instagram',
  tone: 'Friendly',
  brief: '',
}

const REQUIRED: { key: keyof CampaignInput; message: string }[] = [
  { key: 'name', message: 'Give the campaign a name.' },
  { key: 'product_or_service', message: 'Describe the product or service.' },
  { key: 'target_audience', message: 'Say who the campaign is for.' },
  { key: 'objective', message: 'Describe what the campaign should achieve.' },
]

const STEPS = ['Your details', 'Plan & create']

export function CreateCampaignPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CampaignInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ id: number; imageError: string | null } | null>(null)

  const dirty = created === null && (JSON.stringify(form) !== JSON.stringify(EMPTY) || image !== null)
  useUnsavedGuard(dirty)

  // Navigate only after the saved state has rendered, so the unsaved-changes guard is off.
  useEffect(() => {
    if (!created) return
    navigate(
      `/campaigns/${created.id}`,
      created.imageError ? { state: { imageError: created.imageError } } : undefined,
    )
  }, [created, navigate])

  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const problems: Record<string, string> = {}
    for (const { key, message } of REQUIRED) {
      if (!form[key].trim()) problems[key] = message
    }
    setFieldErrors(problems)
    if (Object.keys(problems).length > 0) return

    setSubmitting(true)
    setError(null)
    let campaign
    try {
      campaign = await campaignApi.create(form)
    } catch (err) {
      // The form keeps everything the user typed.
      setError(errorMessage(err))
      if (err instanceof ApiError) setFieldErrors(err.fields)
      setSubmitting(false)
      return
    }

    // The campaign is saved at this point. If the optional image fails, the campaign still
    // opens and the workspace explains what went wrong.
    let imageError: string | null = null
    if (image) {
      try {
        await visualApi.upload(campaign.id, image, 'product_image', '')
      } catch (err) {
        imageError = `Your campaign was saved, but the image couldn't be uploaded: ${errorMessage(err)} Add it from the campaign page.`
      }
    }
    setCreated({ id: campaign.id, imageError })
  }

  return (
    <div className="mx-auto w-full max-w-[54rem]">
      <header className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Create campaign
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Start with the basics. You'll build the strategy on the next screen.
          </p>
        </div>
        <StepIndicator steps={STEPS} current={0} />
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {error && <ErrorMessage message={error} />}

        <Section index="01" title="Campaign basics">
          <FormField label="Campaign name" htmlFor="name" required error={fieldErrors.name}>
            <input
              id="name"
              className="field"
              value={form.name}
              maxLength={120}
              placeholder="Summer launch"
              onChange={(e) => set('name', e.target.value)}
            />
          </FormField>

          <FormField
            label="Product or service"
            htmlFor="product"
            required
            error={fieldErrors.product_or_service}
          >
            <input
              id="product"
              className="field"
              value={form.product_or_service}
              maxLength={200}
              placeholder="Reusable steel water bottle"
              onChange={(e) => set('product_or_service', e.target.value)}
            />
          </FormField>

          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              label="Target audience"
              htmlFor="audience"
              required
              error={fieldErrors.target_audience}
            >
              <input
                id="audience"
                className="field"
                value={form.target_audience}
                maxLength={300}
                placeholder="Urban commuters aged 22–35"
                onChange={(e) => set('target_audience', e.target.value)}
              />
            </FormField>
            <FormField
              label="Campaign objective"
              htmlFor="objective"
              required
              error={fieldErrors.objective}
            >
              <input
                id="objective"
                className="field"
                value={form.objective}
                maxLength={300}
                placeholder="Drive pre-orders before launch"
                onChange={(e) => set('objective', e.target.value)}
              />
            </FormField>
          </div>
        </Section>

        <Section index="02" title="Campaign settings">
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Target platform" htmlFor="platform" error={fieldErrors.platform}>
              <select
                id="platform"
                className="field"
                value={form.platform}
                onChange={(e) => set('platform', e.target.value as CampaignInput['platform'])}
              >
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Brand tone" htmlFor="tone" error={fieldErrors.tone}>
              <select
                id="tone"
                className="field"
                value={form.tone}
                onChange={(e) => set('tone', e.target.value)}
              >
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormField>
          </div>
        </Section>

        <Section index="03" title="Product assets">
          <FormField
            label="Product image"
            htmlFor="campaign-image"
            hint="Optional. You can add or change it later."
          >
            <CampaignImageUpload file={image} onChange={setImage} disabled={submitting} id="campaign-image" />
          </FormField>
        </Section>

        <Section index="04" title="Product brief">
          <FormField
            label="Brief and product facts"
            htmlFor="brief"
            hint="Optional. Only facts you list here are used as claims in your content."
            error={fieldErrors.brief}
          >
            <textarea
              id="brief"
              className="field min-h-32 resize-y"
              value={form.brief}
              maxLength={4000}
              placeholder="Keeps drinks cold for 24 hours. Made from recycled steel. Available in four colors."
              onChange={(e) => set('brief', e.target.value)}
            />
          </FormField>
        </Section>

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" className="btn-ghost" onClick={() => navigate('/')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary text-base" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? (image ? 'Saving campaign and image…' : 'Saving…') : 'Create campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Campaign creation steps">
      {steps.map((step, i) => {
        const isCurrent = i === current
        const isDone = i < current
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`rounded-none border-2 border-ink px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isCurrent
                  ? 'bg-lime text-ink shadow-brut-xs'
                  : isDone
                    ? 'bg-surface text-ink'
                    : 'bg-canvas text-ink-mute'
              }`}
            >
              {step}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-0.5 w-4 bg-ink/40" />}
          </li>
        )
      })}
    </ol>
  )
}

function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-5 sm:p-6" aria-label={title}>
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-none border-2 border-ink bg-coral font-display text-sm font-bold text-ink shadow-brut-xs">
          {index}
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight text-ink">{title}</h2>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}
