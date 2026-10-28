import { LayoutDashboard, PlusCircle, Sparkles } from 'lucide-react'
import { useState, type FocusEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/campaigns/new', label: 'Create campaign', icon: PlusCircle },
]

// The auto-collapse is a hover feature, so it only applies on desktop (md+),
// where a pointer exists. Touch devices keep the full-width top navigation.
const isDesktop = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-width: 48rem)').matches

export function AppLayout() {
  // Expanded by default on desktop; collapses when the pointer leaves the
  // sidebar and expands again when it returns (no toggle button).
  const [expanded, setExpanded] = useState(isDesktop)

  // Keep the sidebar open while focus moves between its links; collapse only
  // when focus truly leaves the sidebar.
  function handleBlurCapture(event: FocusEvent<HTMLElement>) {
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) return
    setExpanded(false)
  }

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`border-b-2 border-ink bg-surface md:sticky md:top-0 md:h-screen md:shrink-0 md:border-r-2 md:border-b-0 md:transition-[width] md:duration-200 md:ease-in-out ${
          expanded ? 'md:w-64' : 'md:w-[72px]'
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocusCapture={() => setExpanded(true)}
        onBlurCapture={handleBlurCapture}
      >
        <div
          className={`flex flex-col gap-6 px-4 py-4 md:py-6 md:transition-[padding] md:duration-200 md:ease-in-out ${
            expanded ? 'md:px-5' : 'md:px-3'
          }`}
        >
          <div
            className={`flex items-center ${expanded ? 'md:justify-start' : 'md:justify-center'}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-none border-2 border-ink bg-lime text-ink shadow-brut-xs">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap font-display text-lg font-bold tracking-tight text-ink md:transition-[opacity,max-width,margin] md:duration-200 md:ease-in-out ${
                expanded ? 'md:ml-3 md:max-w-40 md:opacity-100' : 'md:ml-0 md:max-w-0 md:opacity-0'
              }`}
            >
              CreatorOS
            </span>
          </div>
          <nav className="flex gap-2 md:flex-col" aria-label="Main">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `group relative flex items-center gap-2.5 rounded-none border-2 py-2.5 text-sm font-semibold transition-[transform,box-shadow] duration-100 md:transition-[transform,box-shadow,padding] md:duration-200 ${
                    expanded ? 'md:px-3.5' : 'md:px-3 md:justify-center'
                  } ${
                    isActive
                      ? 'border-ink bg-lime text-ink shadow-brut-xs'
                      : 'border-transparent text-ink-soft hover:border-ink hover:bg-surface hover:text-ink'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span
                  className={`overflow-hidden whitespace-nowrap md:transition-[opacity,max-width] md:duration-200 md:ease-in-out ${
                    expanded ? 'md:max-w-40 md:opacity-100' : 'hidden md:hidden md:max-w-0 md:opacity-0'
                  }`}
                >
                  {label}
                </span>
                {/* Visual tooltip while collapsed; appears only on hover or focus of the individual icon */}
                {!expanded && (
                  <span
                    role="tooltip"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full top-1/2 z-40 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-none border-2 border-ink bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-brut-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:pointer-events-none"
                  >
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
