import { LayoutDashboard, PlusCircle, Sparkles } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/campaigns/new', label: 'Create campaign', icon: PlusCircle },
]

export function AppLayout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-4 px-4 py-3 md:block md:px-5 md:py-6">
          <div className="flex items-center gap-2 text-zinc-100">
            <span className="rounded-lg bg-accent p-1.5 text-white">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <span className="font-semibold tracking-tight">CreatorOS</span>
          </div>
          <nav className="flex gap-1 md:mt-8 md:flex-col" aria-label="Main">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-raised text-zinc-100'
                      : 'text-zinc-400 hover:bg-raised hover:text-zinc-100'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden />
                {label}
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
