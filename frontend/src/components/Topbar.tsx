import { useAuthStore, useUIStore } from '@/store'
import { Moon, Sun, Menu } from 'lucide-react'

export default function Topbar() {
  const user = useAuthStore((s) => s.user)
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="rounded-lg p-2 hover:bg-accent transition-colors lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Inventory Management System
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-all duration-200"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-sm font-bold">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
